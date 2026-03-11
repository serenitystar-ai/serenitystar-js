import { EventEmitter } from "../../../EventEmitter";
import {
  AgentExecutionOptions,
  AgentResult,
  ExecuteBodyParams,
  FileUploadRes,
  SSEStreamEvents,
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

export class Conversation extends EventEmitter<SSEStreamEvents> {
  private agentCode: string;
  private apiKey: string;
  private baseUrl: string;

  // Optional parameters.
  private userIdentifier?: string;
  private agentVersion?: number;
  private channel?: string;
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

  private constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ) {
    super();
    this.apiKey = apiKey;
    this.agentCode = agentCode;
    this.baseUrl = baseUrl;
    this.volatileKnowledge = new VolatileKnowledgeManager(baseUrl, apiKey);
    this.fileManager = new FileManager(baseUrl, apiKey);

    this.agentVersion = options?.agentVersion;
    this.userIdentifier = options?.userIdentifier;
    this.channel = options?.channel;
    this.inputParameters = options?.inputParameters;
  }

  private static async create(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ): Promise<Conversation> {
    const instance = new Conversation(agentCode, apiKey, baseUrl, options);
    await instance.getInfo();
    return instance;
  }

  private static createWithoutInfo(
    agentCode: string,
    apiKey: string,
    baseUrl: string
  ): Conversation {
    return new Conversation(agentCode, apiKey, baseUrl);
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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": this.apiKey,
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
    let url = `${this.baseUrl}/v2/agent/${this.agentCode}`;
    if (this.agentVersion) {
      url += `/${this.agentVersion}`;
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, "Failed to get conversation initial info");
      throw error;
    }
    
    const data = await response.json();
    
    this.info = data as ConversationInfoResult;
    return this.info;
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
   * ```
   */
  async submitFeedback(options: SubmitFeedbackOptions): Promise<SubmitFeedbackResult> {
    if (!this.conversationId) {
      throw new Error("Conversation ID is not set. Please send a message first to initialize the conversation.");
    }

    const url = `${this.baseUrl}/agent/${this.agentCode}/conversation/${this.conversationId}/message/${options.agentMessageId}/feedback`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feedback: options.feedback
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

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-API-KEY": this.apiKey,
      },
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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": this.apiKey,
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
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

    return new Promise(async (resolve, reject) => {
      connection.on("start", () => {
        this.emit("start");
      });

      connection.on("error", (data) => {
        const error = JSON.parse(data);
        this.emit("error", error);
        reject(error);
      });

      connection.on("content", (data) => {
        const chunk = JSON.parse(data);
        this.emit("content", chunk.text);
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

      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": this.apiKey,
        },
        body: JSON.stringify(body),
      };

      try {
        await connection.start(url, fetchOptions);
      } catch (error) {
        const response = await InternalErrorHelper.process(error, errorMessage);
        reject(response);
      }
    });
  }

  #getExecuteUrl(): string {
    const version = this.agentVersion ? `/${this.agentVersion}` : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
  }

  #createExecuteBody(options: CreateExecuteBodyOptions): ExecuteBodyParams {
    let body: ExecuteBodyParams = [
      {
        Key: "stream",
        Value: options.stream.toString(),
      },
    ];

    // Add either message or audioInput
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
      ...(options.additionalInfo?.inputParameters ?? {}),
      ...(this.inputParameters ?? {})
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
