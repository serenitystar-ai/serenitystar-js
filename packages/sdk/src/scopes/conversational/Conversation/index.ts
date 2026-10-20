import { EventEmitter } from "../../../EventEmitter";
import {
  AgentExecutionOptions,
  AgentResult,
  ExecuteBodyParams,
  FileUploadRes,
  SSEStreamEvents,
  TaskStartEvent,
  TaskStopEvent,
  ToolApprovalDecision,
  UserChoiceAnswer,
} from "../../../types";
import {
  ConversationInfoResult,
  ConversationRes,
  CreateExecuteBodyOptions,
  MessageAdditionalInfo,
  SubmitFeedbackOptions,
  SubmitFeedbackResult,
  RemoveFeedbackOptions,
  RemoveFeedbackResult,
  GetConnectorStatusOptions,
  ConnectorStatusResult,
  InterruptOptions,
  InterruptResult,
} from "./types";
import { SseConnection } from "./SseConnection";
import { DEFAULT_MAX_QUEUED_INTERRUPTIONS, InterruptionQueue } from "./InterruptionQueue";
import { AgentMapper } from "../../../utils/AgentMapper";
import { AgentTodoParser } from "../../../utils/AgentTodoParser";
import { InternalErrorHelper } from "../../../utils/ErrorHelper";
import { VolatileKnowledgeManager } from "../../../utils/VolatileKnowledgeManager";
import { FileManager } from "../../../utils/FileManager";
import { AuthProvider } from "../../../auth/AuthProvider";
import { fetchWithAuth } from "../../../utils/fetchWithAuth";
import { parseStreamStart } from "./parseStreamStart";

export class Conversation extends EventEmitter<SSEStreamEvents> {
  private agentCode: string;
  private authProvider: AuthProvider;
  private baseUrl: string;

  // Optional parameters.
  private userIdentifier?: string;
  private agentVersion?: number;
  private channel?: string;
  private useChannelVersion: boolean;
  private inputParameters?: { [key: string]: any };
  public conversationId?: string;
  public info: ConversationInfoResult | null = null;
  
  /**
   * Volatile knowledge manager for uploading and managing temporary files.
   * Files uploaded through this manager will be included in the next message/execution.
   * 
   * @example
   * ```typescript
   * const uploadResult = await conversation.volatileKnowledge.upload(file);
   * if (uploadResult.success) {
   *   console.log('File uploaded:', uploadResult.id);
   * }
   * ```
   */
  public readonly volatileKnowledge: VolatileKnowledgeManager;
  private readonly fileManager: FileManager;
  private connection: SseConnection | null = null;
  readonly #interruptions = new InterruptionQueue({
    // Normalized, so a `failed` event always carries the SDK's error envelope.
    send: (message, options) =>
      this.interrupt(message, options).catch(async (error) => {
        throw await InternalErrorHelper.process(error, "Failed to send interruption");
      }),
    emit: (event) => this.emit("interruption", event),
    maxQueued: () => this.info?.agent?.maxQueuedInterruptions ?? DEFAULT_MAX_QUEUED_INTERRUPTIONS,
  });

  private constructor(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentExecutionOptions
  ) {
    super();
    this.authProvider = authProvider;
    this.agentCode = agentCode;
    this.baseUrl = baseUrl;
    this.volatileKnowledge = new VolatileKnowledgeManager(baseUrl, authProvider, agentCode);
    this.fileManager = new FileManager(baseUrl, authProvider);

    this.agentVersion = options?.agentVersion;
    this.userIdentifier = options?.userIdentifier;
    this.channel = options?.channel;
    this.useChannelVersion = options?.useChannelVersion ?? false;
    this.inputParameters = options?.inputParameters;
  }

  private static async create(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentExecutionOptions
  ): Promise<Conversation> {
    const instance = new Conversation(agentCode, authProvider, baseUrl, options);
    await instance.getInfo();
    return instance;
  }

  private static createWithoutInfo(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string
  ): Conversation {
    return new Conversation(agentCode, authProvider, baseUrl);
  }

  async streamMessage(
    message: string,
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions: CreateExecuteBodyOptions = {
      message,
      stream: true,
      additionalInfo: options,
      isNewConversation: !this.conversationId,
    };
    return this.#streamRequest(bodyOptions, "Failed to send message");
  }

  async sendMessage(
    message: string,
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions: CreateExecuteBodyOptions = {
      message,
      stream: false,
      additionalInfo: options,
      isNewConversation: !this.conversationId,
    };
    return this.#executeRequest(bodyOptions, "Failed to send message");
  }

  /**
   * Resolve pending tool (skill) approvals on this conversation and stream the continuation.
   *
   * The request carries no user message — the decision is the whole turn. The paused run is
   * replayed server-side from its cache and the model continues (running the skill if approved).
   *
   * @param decisions - One decision per pending request, keyed by its `request_id`
   * @param options - Optional additional info (input parameters, volatile knowledge ids)
   * @throws Error if there is no conversation yet, or if `decisions` is empty
   *
   * @example
   * ```typescript
   * const result = await conversation.streamMessage("What is the weather in Paris?");
   * const approval = result.pending_actions?.find((a) => a.type === "approval");
   * if (approval) {
   *   await conversation.streamToolApprovals([
   *     { requestId: approval.request_id, approved: true },
   *   ]);
   * }
   * ```
   */
  async streamToolApprovals(
    decisions: ToolApprovalDecision[],
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions = this.#createToolApprovalsBodyOptions(decisions, true, options);
    return this.#streamRequest(bodyOptions, "Failed to resolve tool approvals");
  }

  /**
   * Resolve pending tool (skill) approvals on this conversation and return the continuation.
   *
   * Non-streaming counterpart of {@link Conversation.streamToolApprovals}.
   *
   * @param decisions - One decision per pending request, keyed by its `request_id`
   * @param options - Optional additional info (input parameters, volatile knowledge ids)
   * @throws Error if there is no conversation yet, or if `decisions` is empty
   */
  async sendToolApprovals(
    decisions: ToolApprovalDecision[],
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions = this.#createToolApprovalsBodyOptions(decisions, false, options);
    return this.#executeRequest(bodyOptions, "Failed to resolve tool approvals");
  }

  #createToolApprovalsBodyOptions(
    decisions: ToolApprovalDecision[],
    stream: boolean,
    options?: MessageAdditionalInfo
  ): CreateExecuteBodyOptions {
    if (!this.conversationId) {
      throw new Error(
        "Conversation ID is not set. Tool approvals can only be resolved on an existing conversation."
      );
    }
    if (!decisions || decisions.length === 0) {
      throw new Error("At least one tool approval decision is required.");
    }

    return {
      stream,
      isNewConversation: false,
      additionalInfo: options,
      toolApprovals: decisions.map((decision) => {
        const reason = decision.reason?.trim();
        return {
          requestId: decision.requestId,
          approved: decision.approved,
          ...(reason ? { reason } : {}),
        };
      }),
    };
  }

  /**
   * Answer the questions the agent asked (a `user_choice` pending action) and stream the
   * continuation.
   *
   * The request carries no user message — the answers are the whole turn. Unlike an
   * approval, nothing is cached server-side: the answers are folded into the text of the
   * user message, so a set can be answered on any later turn and never goes stale.
   *
   * @param answers - One answer per question, keyed by its `questionId`
   * @param options - Optional additional info (input parameters, volatile knowledge ids)
   * @throws Error if there is no conversation yet, or if `answers` is empty
   *
   * @example
   * ```typescript
   * const result = await conversation.streamMessage("Help me pick a plan.");
   * const choice = result.pending_actions?.find((a) => a.type === "user_choice");
   * if (choice) {
   *   await conversation.streamUserChoices(
   *     choice.questions.map((question) => ({
   *       questionId: question.id,
   *       selectedOptionIds: [question.options![0].id],
   *     })),
   *   );
   * }
   * ```
   */
  async streamUserChoices(
    answers: UserChoiceAnswer[],
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions = this.#createUserChoicesBodyOptions(answers, true, options);
    return this.#streamRequest(bodyOptions, "Failed to submit user choices");
  }

  /**
   * Answer the questions the agent asked and return the continuation.
   *
   * Non-streaming counterpart of {@link Conversation.streamUserChoices}.
   *
   * @param answers - One answer per question, keyed by its `questionId`
   * @param options - Optional additional info (input parameters, volatile knowledge ids)
   * @throws Error if there is no conversation yet, or if `answers` is empty
   */
  async sendUserChoices(
    answers: UserChoiceAnswer[],
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const bodyOptions = this.#createUserChoicesBodyOptions(answers, false, options);
    return this.#executeRequest(bodyOptions, "Failed to submit user choices");
  }

  #createUserChoicesBodyOptions(
    answers: UserChoiceAnswer[],
    stream: boolean,
    options?: MessageAdditionalInfo
  ): CreateExecuteBodyOptions {
    if (!this.conversationId) {
      throw new Error(
        "Conversation ID is not set. User choices can only be answered on an existing conversation."
      );
    }
    if (!answers || answers.length === 0) {
      throw new Error("At least one user choice answer is required.");
    }

    return {
      stream,
      isNewConversation: false,
      additionalInfo: options,
      userChoices: answers.map((answer) => {
        const other = answer.other?.trim();
        return {
          questionId: answer.questionId,
          selectedOptionIds: answer.selectedOptionIds ?? [],
          ...(other ? { other } : {}),
        };
      }),
    };
  }

  async sendAudioMessage(
    audio: Blob,
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    try {
      let uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
      uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;
      const bodyOptions: CreateExecuteBodyOptions = {
        audio: { fileId: uploadResult.id },
        stream: false,
        additionalInfo: options,
        isNewConversation: !this.conversationId,
      };
      return await this.#executeRequest(bodyOptions, "Failed to send audio message", uploadResult);
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or send audio message");
    }
  }

  async streamAudioMessage(
    audio: Blob,
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    let uploadResult: FileUploadRes;
    try {
      uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or stream audio message");
    }
    uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;

    const bodyOptions: CreateExecuteBodyOptions = {
      audio: { fileId: uploadResult.id },
      stream: true,
      additionalInfo: options,
      isNewConversation: !this.conversationId,
    };
    // Outside the upload's catch: a streamed error frame has no statusCode and would be
    // flattened into a generic 500.
    return this.#streamRequest(bodyOptions, "Failed to send audio message", uploadResult);
  }

  /**
   * Download an attached file from a conversation message.
   *
   * @param downloadUrl - Attachment download URL
   * @returns The downloaded attachment as a Blob
   */
  async downloadAttachment(downloadUrl: string): Promise<Blob> {
    return await this.fileManager.download(downloadUrl);
  }

  /**
   * Download a knowledge file cited in a conversation message. Only sources whose
   * `is_downloadable` is true can be fetched; anything else answers 404.
   *
   * @param knowledgeFileVersionId - The `knowledge_file_version_id` from a citation's `knowledge_file` source
   * @returns The file as a Blob
   */
  async downloadKnowledgeFile(knowledgeFileVersionId: string): Promise<Blob> {
    return await this.fileManager.download(this.#getKnowledgeFileDownloadUrl(knowledgeFileVersionId));
  }

  /**
   * Stops the current streaming response, aborting the SSE connection.
   * If no stream is active, this method does nothing.
   *
   * The pending `streamMessage` (or other stream) promise resolves with `aborted: true`, the
   * content streamed so far and the instance id announced on `start`. It does not reject.
   * 
   * @example
   * ```typescript
   * conversation.on("content", (chunk) => {
   *   if (shouldStop) {
   *     conversation.stop();
   *   }
   * });
   * ```
   */
  stop(): void {
    if (this.connection) {
      this.connection.abort();
      this.connection = null;
    }
  }

  /**
   * Queue a message for the turn that is streaming right now, so the agent takes it into
   * account without finishing first (User Interruptions).
   *
   * The message is held until the turn accepts interruptions, then sent. Messages are sent
   * one at a time in the order they were queued, and sending pauses while the server holds
   * `info.agent.maxQueuedInterruptions` of them. Follow each message through the
   * `interruption` event, using the id this method returns. When `merged` arrives, the
   * content streamed from then on answers it.
   *
   * Nothing is lost: what the turn doesn't take ends `deferred` (send it as a regular
   * message) or `dropped` (the server discarded it). With no streamed turn running, or when
   * `info.agent.userInterruptionsEnabled` is `false`, the message is `deferred` right away.
   *
   * Only text is supported: attachments and audio need a turn of their own.
   *
   * @param message - The text to send.
   * @param options - Input parameters for the message.
   * @returns The id the `interruption` events carry for this message.
   *
   * @example
   * ```typescript
   * conversation.on("interruption", (event) => {
   *   if (event.status === "merged") startNewResponseBubble();
   *   if (event.status === "deferred") conversation.streamMessage(event.message);
   * });
   *
   * const id = conversation.queueInterruption("Also include prices, please.");
   * ```
   */
  queueInterruption(message: string, options?: InterruptOptions): string {
    const text = message?.trim();
    if (!text) {
      throw new Error("An interruption needs a non-empty message.");
    }

    const enabled = this.info?.agent?.userInterruptionsEnabled !== false;
    return this.#interruptions.enqueue(text, options, enabled);
  }

  /**
   * Send a message straight to the turn streaming on this conversation. Prefer
   * `queueInterruption`, which waits for the turn to accept it, keeps the order of several
   * messages and handles the limits below.
   *
   * The answer streams on the running turn: a `queued` message is announced by a
   * `task_stop` whose `task_key` is `interruption_merged` and whose
   * `output.user_message_id` is this result's `userMessageId`.
   *
   * Rejects with a `validation_error` whose `errors` key tells why the message was refused:
   * `interruption_not_accepted` (no turn is accepting messages: send it as a regular one),
   * `user_interruptions_disabled`, `interruption_queue_full` or
   * `interruption_input_not_supported`.
   *
   * @param message - The text to send.
   * @param options - Input parameters for the message.
   */
  async interrupt(message: string, options?: InterruptOptions): Promise<InterruptResult> {
    if (!this.conversationId) {
      throw new Error("Conversation ID is not set. Please send a message first to initialize the conversation.");
    }

    const body: ExecuteBodyParams = [
      { Key: "message", Value: message },
      { Key: "chatId", Value: this.conversationId },
    ];
    this.#appendInputParametersIfNeeded(body, {
      ...(this.inputParameters ?? {}),
      ...(options?.inputParameters ?? {}),
    });
    this.#appendChannelIfNeeded(body);

    const response = await fetchWithAuth(this.authProvider, `${this.baseUrl}/v2/agent/${this.agentCode}/interrupt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200 && response.status !== 202) {
      throw await InternalErrorHelper.process(response, "Failed to send interruption");
    }

    const data = await response.json();
    return {
      status: String(data?.status).toLowerCase() === "blocked" ? "blocked" : "queued",
      instanceId: data?.instanceId,
      userMessageId: data?.userMessageId ?? undefined,
      content: data?.content ?? undefined,
      violations: data?.violations ?? undefined,
    };
  }

  async getConversationById(
    id: string,
    options: {
      showExecutorTaskLogs: boolean;
    } = {
      showExecutorTaskLogs: false,
    }
  ): Promise<ConversationRes> {
    let url = `${this.baseUrl}/v2/agent/${this.agentCode}/conversation/${id}`;

    const queryParams = new URLSearchParams();
    if (options.showExecutorTaskLogs) {
      queryParams.append("showExecutorTaskLogs", "true");
    }

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, "Failed to get conversation by id");
      throw error;
    }

    const data = await response.json();

    // Map messagesJson string to messages array
    if (data.messagesJson && typeof data.messagesJson === 'string') {
      try {
        data.messages = JSON.parse(data.messagesJson);
        delete data.messagesJson; // Remove the original string property
      } catch (error) {
        throw new Error("Failed to parse messagesJson: " + error);
      }
    }

    return data as ConversationRes;
  }

  async getInfo(): Promise<ConversationInfoResult> {
    const info = await this.#fetchInfo(this.#getAgentVersion());

    // If the consumer opted in to channel version pinning and no explicit
    // agentVersion was provided, re-fetch info for the channel's target version
    // so the returned info matches the version that will be executed.
    const targetVersion = info.channel?.targetAgentVersion;
    if (this.useChannelVersion && !this.agentVersion && targetVersion && targetVersion !== this.#getAgentVersion()) {
      const versionedInfo = await this.#fetchInfo(targetVersion);
      this.info = versionedInfo;
      return this.info;
    }

    this.info = info;
    return this.info;
  }

  async #fetchInfo(agentVersion?: number): Promise<ConversationInfoResult> {
    let url = `${this.baseUrl}/v2/agent/${this.agentCode}`;
    if (agentVersion) {
      url += `/${agentVersion}`;
    }
    url += "/conversation/info";

    let body: {
      channel?: string;
      inputParameters?: ExecuteBodyParams;
      userIdentifier?: string;
    } = {};

    if (this.channel) {
      body.channel = this.channel;
    }
    if (this.inputParameters) {
      body.inputParameters = [];
      this.#appendInputParametersIfNeeded(
        body.inputParameters,
        this.inputParameters
      );
    }
    if (this.userIdentifier) {
      body.userIdentifier = this.userIdentifier;
    }

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, "Failed to get conversation initial info");
      throw error;
    }

    const data = await response.json();
    return data as ConversationInfoResult;
  }

  /**
   * Submit feedback for an agent message in the conversation.
   * 
   * @param options - The feedback options including the agent message ID and feedback value
   * @returns A promise that resolves to the feedback submission result
   * @throws Error if the conversation ID is not set or if the request fails
   * 
   * @example
   * ```typescript
   * const conversation = await client.agents.assistants.createConversation("agent-code");
   * const response = await conversation.sendMessage("Hello!");
   * 
   * // Submit positive feedback
   * await conversation.submitFeedback({
   *   agentMessageId: response.agent_message_id!,
   *   feedback: true
   * });
   *
   * // Submit negative feedback with a comment
   * await conversation.submitFeedback({
   *   agentMessageId: response.agent_message_id!,
   *   feedback: false,
   *   comment: "The answer missed the pricing details."
   * });
   * ```
   */
  async submitFeedback(options: SubmitFeedbackOptions): Promise<SubmitFeedbackResult> {
    if (!this.conversationId) {
      throw new Error("Conversation ID is not set. Please send a message first to initialize the conversation.");
    }

    const url = `${this.baseUrl}/agent/${this.agentCode}/conversation/${this.conversationId}/message/${options.agentMessageId}/feedback`;

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feedback: options.feedback,
        comment: options.comment
      }),
    });

    if (response.status !== 200) {
      return {
        success: false,
        error: await InternalErrorHelper.process(response, "Failed to submit feedback"),
      }
    }

    return {
      success: true
    }
  }

  /**
   * Remove feedback for an agent message in the conversation.
   * 
   * @param options - The feedback options including the agent message ID
   * @returns A promise that resolves to the feedback removal result
   * @throws Error if the conversation ID is not set or if the request fails
   * 
   * @example
   * ```typescript
   * const conversation = await client.agents.assistants.createConversation("agent-code");
   * const response = await conversation.sendMessage("Hello!");
   * 
   * // Submit feedback first
   * await conversation.submitFeedback({
   *   agentMessageId: response.agent_message_id!,
   *   feedback: true
   * });
   * 
   * // Remove feedback
   * await conversation.removeFeedback({
   *   agentMessageId: response.agent_message_id!
   * });
   * ```
   */
  async removeFeedback(options: RemoveFeedbackOptions): Promise<RemoveFeedbackResult> {
    if (!this.conversationId) {
      throw new Error("Conversation ID is not set. Please send a message first to initialize the conversation.");
    }

    const url = `${this.baseUrl}/agent/${this.agentCode}/conversation/${this.conversationId}/message/${options.agentMessageId}/feedback`;

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "DELETE",
      headers: {},
    });

    if (response.status !== 200) {
      return {
        success: false,
        error: await InternalErrorHelper.process(response, "Failed to remove feedback"),
      }
    }

    return {
      success: true
    }
  }

  /**
   * Get the connector status for a specific agent instance and connector.
   * 
   * @param options - The connector status options including agent instance ID and connector ID
   * @returns A promise that resolves to the connector status result
   * @throws Error if the request fails
   * 
   * @example
   * ```typescript
   * const conversation = await client.agents.assistants.createConversation("agent-code");
   * 
   * // Check connector status
   * const status = await conversation.getConnectorStatus({
   *   agentInstanceId: conversation.conversationId!,
   *   connectorId: "connector-uuid"
   * });
   * 
   * console.log(status.isConnected); // true or false
   * ```
   */
  async getConnectorStatus(options: GetConnectorStatusOptions): Promise<ConnectorStatusResult> {
    const url = `${this.baseUrl}/connection/agentInstance/${options.agentInstanceId}/connector/${options.connectorId}/status`;

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, "Failed to get connector status");
      throw error;
    }

    const data = await response.json();
    return data as ConnectorStatusResult;
  }

  async #executeRequest(
    bodyOptions: CreateExecuteBodyOptions,
    errorMessage: string,
    audioUploadResult?: FileUploadRes
  ): Promise<AgentResult> {
    const url = this.#getExecuteUrl();
    const body = this.#createExecuteBody(bodyOptions);

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      throw await InternalErrorHelper.process(response, errorMessage);
    }

    const data = await response.json();
    const mappedData = AgentMapper.mapAgentResultToSnakeCase(data);
    
    if (!this.conversationId) {
      this.conversationId = mappedData.instance_id;
    }
    this.volatileKnowledge.clear();

    return mappedData;
  }

  async #streamRequest(
    bodyOptions: CreateExecuteBodyOptions,
    errorMessage: string,
    audioUploadResult?: FileUploadRes
  ): Promise<AgentResult> {
    const url = this.#getExecuteUrl();
    const body = this.#createExecuteBody(bodyOptions);

    const connection = new SseConnection();
    this.connection = connection;
    const interruptionRun = this.#interruptions.beginRun();

    let content = "";
    let instanceId: string | undefined;

    return new Promise<AgentResult>((resolvePromise, rejectPromise) => {
      // Settle the interruptions the turn didn't take first, so their events precede the result.
      const resolve = (result: AgentResult) => {
        this.#interruptions.endRun(interruptionRun);
        resolvePromise(result);
      };
      const reject = (error: unknown) => {
        this.#interruptions.endRun(interruptionRun);
        rejectPromise(error);
      };

      connection.on("start", (data) => {
        const start = parseStreamStart(data);
        instanceId = start.instance_id;
        // The server creates the conversation before it streams, so a turn cancelled from
        // here on still belongs to it.
        if (instanceId && !this.conversationId) {
          this.conversationId = instanceId;
        }
        this.emit("start", start);
      });

      connection.on("error", (data) => {
        // Emit and reject with the same normalized frame, so a streamed failure exposes
        // the same `code` / `message` / `errors` as a buffered one.
        const error = InternalErrorHelper.parseStreamError(data, errorMessage);
        this.emit("error", error);
        reject(error);
      });

      connection.on("content", (data) => {
        const chunk = JSON.parse(data);
        content += chunk.text ?? "";
        this.emit("content", chunk.text, chunk.citations);
      });

      connection.on("reasoning", (data) => {
        const chunk = JSON.parse(data);
        this.emit("reasoning", chunk.text);
      });

      // Task events are informational: a malformed frame must never reject the stream.
      connection.on("task_start", (data) => {
        let task: TaskStartEvent;
        try {
          task = JSON.parse(data) as TaskStartEvent;
        } catch {
          // Ignore unparseable task frames.
          return;
        }

        try {
          this.emit("task_start", task);
        } catch {
          // A failing task_start handler must not keep the interruption window closed.
        }

        this.#interruptions.handleTaskStart(task);
      });

      connection.on("task_stop", (data) => {
        let task: TaskStopEvent;
        try {
          task = JSON.parse(data) as TaskStopEvent;
        } catch {
          // Ignore unparseable task frames.
          return;
        }

        try {
          this.emit("task_stop", task);
        } catch {
          // A failing task_stop handler must not keep the TODO snapshot from its listeners.
        }

        try {
          const todo = AgentTodoParser.fromTaskStop(task);
          if (todo) this.emit("agent_todo", todo);
        } catch {
          // Ignore failures of the TODO listeners, like those of any task frame.
        }

        this.#interruptions.handleTaskStop(task);
      });

      connection.on("stop", (data) => {
        const finalMessage = JSON.parse(data) as { result: AgentResult };

        if (!this.conversationId) {
          this.conversationId = finalMessage.result.instance_id;
        }
        this.volatileKnowledge.clear();
        this.emit("stop", finalMessage.result);
        resolve(finalMessage.result);
      });

      const run = async () => {
        const authHeaders = await this.authProvider.getHeaders({ url, method: "POST" });
        return connection.start(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(body),
        });
      };

      run()
        .then((outcome) => {
          if (outcome === "completed") return;
          resolve({
            content,
            instance_id: instanceId ?? this.conversationId ?? "",
            ...(outcome === "aborted" ? { aborted: true } : { incomplete: true }),
          });
        })
        .catch(async (error) => {
          reject(await InternalErrorHelper.process(error, errorMessage));
        })
        .finally(() => {
          if (this.connection === connection) {
            this.connection = null;
          }
        });
    });
  }

  #getExecuteUrl(): string {
    const agentVersion = this.#getAgentVersion();
    const version = agentVersion ? `/${agentVersion}` : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
  }

  #getKnowledgeFileDownloadUrl(knowledgeFileVersionId: string): string {
    const agentVersion = this.#getAgentVersion();
    const version = agentVersion ? `/${agentVersion}` : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}${version}/knowledge/file/${knowledgeFileVersionId}/download`;
  }

  #getAgentVersion() {
    if(this.agentVersion) {
      return this.agentVersion;
    }
    if(this.useChannelVersion && this.info?.channel?.targetAgentVersion) {
      return this.info.channel.targetAgentVersion;
    }
    return undefined;
  }

  #createExecuteBody(options: CreateExecuteBodyOptions): ExecuteBodyParams {
    let body: ExecuteBodyParams = [
      {
        Key: "stream",
        Value: options.stream.toString(),
      },
    ];

    // Add either message or audioInput. An interruption-resume turn has neither: the
    // server's conversational input validator accepts a message-less execution
    // when `toolApprovals` or `userChoiceResponses` is present, so the key must be
    // absent (not empty).
    if (options.message) {
      body.push({
        Key: "message",
        Value: options.message,
      });
    } else if (options.audio) {
      body.push({
        Key: "audioInput",
        Value: options.audio,
      });
    }

    if (options.toolApprovals && options.toolApprovals.length > 0) {
      body.push({
        Key: "toolApprovals",
        Value: options.toolApprovals,
      });
    }

    if (options.userChoices && options.userChoices.length > 0) {
      body.push({
        Key: "userChoiceResponses",
        Value: options.userChoices,
      });
    }

    if (options.isNewConversation) {
      this.#appendUserIdentifierIfNeeded(body);
    } else {
      body.push({
        Key: "chatId",
        Value: this.conversationId,
      });
    }

    this.#appendInputParametersIfNeeded(
      body,
      {
        ...(this.inputParameters ?? {}),
        ...(options.additionalInfo?.inputParameters ?? {})
      }
    );
    
    // Merge volatile knowledge IDs from both sources and remove duplicates
    const mergedVolatileKnowledgeIds = Array.from(new Set([
      ...(options.additionalInfo?.volatileKnowledgeIds ?? []),
      ...this.volatileKnowledge.getIds()
    ]));
    this.#appendVolatileKnowledgeIdsIfNeeded(
      body,
      mergedVolatileKnowledgeIds.length > 0 ? mergedVolatileKnowledgeIds : undefined
    );
    this.#appendChannelIfNeeded(body);

    return body;
  }

  #appendUserIdentifierIfNeeded(body: ExecuteBodyParams) {
    if (this.userIdentifier) {
      body.push({
        Key: "userIdentifier",
        Value: this.userIdentifier,
      });
    }
  }

  #appendChannelIfNeeded(body: ExecuteBodyParams) {
    if (this.channel) {
      body.push({
        Key: "channel",
        Value: this.channel,
      });
    }
  }

  #appendInputParametersIfNeeded(
    body: ExecuteBodyParams,
    parameters: { [key: string]: any } = {}
  ) {
    if (!parameters || Object.keys(parameters).length === 0) return;

    for (const [key, value] of Object.entries(parameters)) {
      body.push({
        Key: key,
        Value: value,
      });
    }
  }

  #appendVolatileKnowledgeIdsIfNeeded(
    body: ExecuteBodyParams,
    volatileKnowledgeIds?: string[]
  ) {
    if (!volatileKnowledgeIds || volatileKnowledgeIds.length === 0) return;

    body.push({
      Key: "volatileKnowledgeIds",
      Value: volatileKnowledgeIds,
    });
  }
}
