import { EventEmitter } from "../../../EventEmitter";
import { AgentExecutionOptions, AgentExecutionOptionsWithParameters, AgentResult, ExecuteBodyParams, SSEStreamEvents } from "../../../types";
import { InitConversationParams, InitConversationResponse, MessageOptions } from "./types";
import { SseConnection } from "./SseConnection";
import { AgentMapper } from "../../../utils/AgentMapper";

export class Conversation extends EventEmitter<SSEStreamEvents> {
  private agentCode: string;
  private apiKey: string;
  private baseUrl: string;

  // Optional parameters.
  private inputParameters?: { [key: string]: any };
  private userIdentifier?: string;
  private agentVersion?: number;
  private channel?: string;

  public conversationId?: string;

  private constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptionsWithParameters
  ) {
    super();
    this.apiKey = apiKey;
    this.agentCode = agentCode;
    this.baseUrl = baseUrl;

    this.agentVersion = options?.agentVersion;
    this.inputParameters = options?.inputParameters;
    this.userIdentifier = options?.userIdentifier;
    this.channel = options?.channel;
  }

  private static async create(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ): Promise<Conversation> {
    const instance = new Conversation(agentCode, apiKey, baseUrl, options);
    await instance.#getConversationId();
    return instance;
  }

  async #getConversationId(): Promise<void> {
    if (this.conversationId) return;

    const version = this.agentVersion ? `/${this.agentVersion}` : '';
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/conversation${version}`;
    let reqBody: InitConversationParams = {};

    this.#appendInitConversationParamsIfNeeded(reqBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify(reqBody),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    const body = await response.json();

    if (response.status !== 200) {
      throw new Error(body.message || "Failed to initialize conversation");
    }

    const data = body as InitConversationResponse;
    this.conversationId = data.chatId;
  }

  async streamMessage(message: string, options?: MessageOptions): Promise<AgentResult> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }
    const version = this.agentVersion ? `/${this.agentVersion}` : '';
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
    
    let body = this.#createExecuteBody(message, true, options);

    const connection = new SseConnection();
    let responsePromise: Promise<AgentResult>;

    responsePromise = new Promise((resolve, reject) => {
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
        const finalMessage = JSON.parse(data) as { result: AgentResult};
        this.emit("stop", finalMessage.result);
        resolve(finalMessage.result);
      });
    });

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify(body),
    };

    connection.start(url, fetchOptions).catch((error) => {
      this.emit("error", { message: error.message });
      throw error;
    });

    return responsePromise;
  }

  async sendMessage(message: string, options?: MessageOptions): Promise<AgentResult> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }
    const version = this.agentVersion ? `/${this.agentVersion}` : '';
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
    
    let body = this.#createExecuteBody(message, false, options);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    const data = await response.json();
    if (response.status !== 200) {
      throw new Error(data.message || "Failed to execute message");
    }

    const mappedData = AgentMapper.mapAgentResultToSnakeCase(data);

    return mappedData;
  }

  #createExecuteBody(message: string, stream: boolean, options?: MessageOptions): ExecuteBodyParams {
    let body: ExecuteBodyParams = [
      {
        Key: "chatId",
        Value: this.conversationId,
      },
      {
        Key: "message",
        Value: message,
      },
      {
        Key: "stream",
        Value: stream.toString(),
      },
    ];

    this.#appendInputParametersIfNeeded(body, options?.inputParameters);
    this.#appendVolatileKnowledgeIdsIfNeeded(body, options?.volatileKnowledgeIds);
    this.#appendUserIdentifierIfNeeded(body);
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

  #appendInputParametersIfNeeded(body: ExecuteBodyParams, parameters: { [key: string]: any } = {}) {
    if (!parameters || Object.keys(parameters).length === 0) return;

    for (const [key, value] of Object.entries(parameters)) {
      body.push({
        Key: key,
        Value: value,
      });
    }
  }

  #appendInitConversationParamsIfNeeded(body: InitConversationParams) {
    if (this.userIdentifier) {
      body.userIdentifier = this.userIdentifier;
    }

    if (this.inputParameters) {
      body.inputParameters = [];
      this.#appendInputParametersIfNeeded(body.inputParameters, this.inputParameters);
    }
  }

  #appendVolatileKnowledgeIdsIfNeeded(body: ExecuteBodyParams, volatileKnowledgeIds?: string[]) {
    if (!volatileKnowledgeIds || volatileKnowledgeIds.length === 0) return;

    body.push({
      Key: "volatileKnowledgeIds",
      Value: volatileKnowledgeIds,
    });
  }
}
