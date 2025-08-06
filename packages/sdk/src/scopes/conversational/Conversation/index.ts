import { EventEmitter } from "../../../EventEmitter";
import {
  AgentExecutionOptions,
  AgentResult,
  ExecuteBodyParams,
  SSEStreamEvents,
} from "../../../types";
import {
  ConversationInfoResult,
  ConversationRes,
  CreateExecuteBodyOptions,
  MessageAdditionalInfo,
} from "./types";
import { SseConnection } from "./SseConnection";
import { AgentMapper } from "../../../utils/AgentMapper";

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
    const version = this.agentVersion ? `/${this.agentVersion}` : "";
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;

    let body = this.#createExecuteBody({
      message,
      stream: true,
      additionalInfo: options,
      isNewConversation: !this.conversationId,
    });

    const connection = new SseConnection();
    let responsePromise: Promise<AgentResult>;

    responsePromise = new Promise(async (resolve, reject) => {
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
        reject(error);
      }
    });

    return responsePromise;
  }

  async sendMessage(
    message: string,
    options?: MessageAdditionalInfo
  ): Promise<AgentResult> {
    const version = this.agentVersion ? `/${this.agentVersion}` : "";
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;

    let body = this.#createExecuteBody({
      message,
      stream: false,
      additionalInfo: options,
      isNewConversation: !this.conversationId,
    });

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
    if (!this.conversationId) {
      this.conversationId = mappedData.instance_id;
    }

    return mappedData;
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

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    const data = await response.json();
    if (response.status !== 200) {
      throw new Error(
        data.message || "Failed to get conversation details by id"
      );
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

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    const data = await response.json();
    if (response.status !== 200) {
      throw new Error(data.message || "Failed to get conversation info");
    }

    this.info = data as ConversationInfoResult;
    return this.info;
  }

  #createExecuteBody(options: CreateExecuteBodyOptions): ExecuteBodyParams {
    let body: ExecuteBodyParams = [
      {
        Key: "message",
        Value: options.message,
      },
      {
        Key: "stream",
        Value: options.stream.toString(),
      },
    ];

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
      options.additionalInfo?.inputParameters
    );
    this.#appendVolatileKnowledgeIdsIfNeeded(
      body,
      options.additionalInfo?.volatileKnowledgeIds
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
