import { EventEmitter } from "../../EventEmitter";
import { AgentResult, ExecuteBodyParams, SSEStreamEvents } from "../../types";
import { AgentMapper } from "../../utils/AgentMapper";
import { SseConnection } from "../conversational/Conversation/SseConnection";
import { SystemAgentExecutionOptionsMap } from "./../../types";

export abstract class SystemAgent<
  T extends keyof SystemAgentExecutionOptionsMap,
> extends EventEmitter<SSEStreamEvents> {
  protected constructor(
    protected readonly agentCode: string,
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
    protected readonly options?: SystemAgentExecutionOptionsMap[T]
  ) {
    super();
  }

  async stream(): Promise<AgentResult> {
    const version = this.options?.agentVersion
      ? `/${this.options.agentVersion}`
      : "";
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;

    let body = this.createExecuteBody(true);

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

  protected async execute(): Promise<AgentResult> {
    const version = this.options?.agentVersion
      ? `/${this.options.agentVersion}`
      : "";
    const url = `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;

    let body = this.createExecuteBody(false);

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

    return AgentMapper.mapAgentResultToSnakeCase(data);
  }

  protected createExecuteBody(
    stream: boolean
  ): ExecuteBodyParams | { [key: string]: any } {
    let body: ExecuteBodyParams = [
      {
        Key: "stream",
        Value: stream.toString(),
      },
    ];

    this.appendVolatileKnowledgeIdsIfNeeded(body);
    this.appendUserIdentifierIfNeeded(body);
    this.appendChannelIfNeeded(body);

    return body;
  }

  protected appendUserIdentifierIfNeeded(body: ExecuteBodyParams) {
    if (this.options?.userIdentifier) {
      body.push({
        Key: "userIdentifier",
        Value: this.options.userIdentifier,
      });
    }
  }

  protected appendVolatileKnowledgeIdsIfNeeded(body: ExecuteBodyParams) {
    if (
      !this.options?.volatileKnowledgeIds ||
      this.options.volatileKnowledgeIds.length === 0
    )
      return;

    body.push({
      Key: "volatileKnowledgeIds",
      Value: this.options.volatileKnowledgeIds,
    });
  }

  protected appendChannelIfNeeded(body: ExecuteBodyParams) {
    if (this.options?.channel) {
      body.push({
        Key: "channel",
        Value: this.options.channel,
      });
    }
  }
}
