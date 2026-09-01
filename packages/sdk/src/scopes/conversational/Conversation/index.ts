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
} from "./types";
import { SseConnection } from "./SseConnection";
import { AgentMapper } from "../../../utils/AgentMapper";
import { InternalErrorHelper } from "../../../utils/ErrorHelper";
import { VolatileKnowledgeManager } from "../../../utils/VolatileKnowledgeManager";
import { FileManager } from "../../../utils/FileManager";
import { AuthProvider } from "../../../auth/AuthProvider";
import { fetchWithAuth } from "../../../utils/fetchWithAuth";

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
    try {
      let uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
      uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;

      const bodyOptions: CreateExecuteBodyOptions = {
        audio: { fileId: uploadResult.id },
        stream: true,
        additionalInfo: options,
        isNewConversation: !this.conversationId,
      };
      return await this.#streamRequest(bodyOptions, "Failed to send audio message", uploadResult);
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or stream audio message");
    }
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
   * Download a knowledge file cited in a conversation message.
   *
   * @param downloadUrl - The `download_url` from a citation's `knowledge_file` source
   * @returns The file as a Blob
   */
  async downloadKnowledgeFile(downloadUrl: string): Promise<Blob> {
    return await this.fileManager.downloadFromApi(downloadUrl);
  }

  /**
   * Stops the current streaming response, aborting the SSE connection.
   * If no stream is active, this method does nothing.
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
      this.connection.stop();
      this.connection = null;
    }
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

    this.connection = new SseConnection();


    return new Promise(async (resolve, reject) => {
      if(!this.connection) {
        reject(new Error("Failed to initialize SSE connection"));
        return;
      }
      this.connection.on("start", () => {
        this.emit("start");
      });

      this.connection.on("error", (data) => {
        const error = JSON.parse(data);
        this.emit("error", error);
        reject(error);
      });

      this.connection.on("content", (data) => {
        const chunk = JSON.parse(data);
        this.emit("content", chunk.text, chunk.citations);
      });

      this.connection.on("reasoning", (data) => {
        const chunk = JSON.parse(data);
        this.emit("reasoning", chunk.text);
      });

      // Task events are informational: a malformed frame must never reject the stream.
      this.connection.on("task_start", (data) => {
        try {
          this.emit("task_start", JSON.parse(data) as TaskStartEvent);
        } catch {
          // Ignore unparseable task frames.
        }
      });

      this.connection.on("task_stop", (data) => {
        try {
          this.emit("task_stop", JSON.parse(data) as TaskStopEvent);
        } catch {
          // Ignore unparseable task frames.
        }
      });

      this.connection.on("stop", (data) => {
        const finalMessage = JSON.parse(data) as { result: AgentResult };

        if (!this.conversationId) {
          this.conversationId = finalMessage.result.instance_id;
        }
        this.volatileKnowledge.clear();
        this.emit("stop", finalMessage.result);
        resolve(finalMessage.result);
      });

      const authHeaders = await this.authProvider.getHeaders();
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      };

      try {
        await this.connection.start(url, fetchOptions);
      } catch (error) {
        const response = await InternalErrorHelper.process(error, errorMessage);
        reject(response);
      } finally {
        if (this.connection) {
          this.connection.stop();
          this.connection = null;
        }
      }
    });
  }

  #getExecuteUrl(): string {
    const agentVersion = this.#getAgentVersion();
    const version = agentVersion ? `/${agentVersion}` : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
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
