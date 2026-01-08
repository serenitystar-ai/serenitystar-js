import { EventEmitter } from "../../EventEmitter";
import { AgentResult, ExecuteBodyParams, SSEStreamEvents } from "../../types";
import { AgentMapper } from "../../utils/AgentMapper";
import { InternalErrorHelper } from "../../utils/ErrorHelper";
import { VolatileKnowledgeManager } from "../../utils/VolatileKnowledgeManager";
import { SseConnection } from "../conversational/Conversation/SseConnection";
import { SystemAgentExecutionOptionsMap } from "./../../types";

export abstract class SystemAgent<
  T extends keyof SystemAgentExecutionOptionsMap,
> extends EventEmitter<SSEStreamEvents> {
  /**
   * Volatile knowledge manager for uploading and managing temporary files.
   * Files uploaded through this manager will be included in the next execution.
   * 
   * @example
   * ```typescript
   * const uploadResult = await activity.volatileKnowledge.upload(file);
   * if (uploadResult.success) {
   *   console.log('File uploaded:', uploadResult.id);
   * }
   * ```
   */
  public readonly volatileKnowledge: VolatileKnowledgeManager;

  protected constructor(
    protected readonly agentCode: string,
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
    protected readonly options?: SystemAgentExecutionOptionsMap[T]
  ) {
    super();
    this.volatileKnowledge = new VolatileKnowledgeManager(baseUrl, apiKey);
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
        // Clear volatile knowledge IDs after message is sent
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
        const response = await InternalErrorHelper.process(error, "Failed to send message");
        reject(response);
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

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, "Failed to send message");
      throw error;
    }
    
    const data = await response.json();
    const mappedData = AgentMapper.mapAgentResultToSnakeCase(data);
    // Clear volatile knowledge IDs after message is sent
    this.volatileKnowledge.clear();
    return mappedData;
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
    // Merge volatile knowledge IDs from both sources and remove duplicates
    const mergedVolatileKnowledgeIds = Array.from(new Set([
      ...(this.options?.volatileKnowledgeIds ?? []),
      ...this.volatileKnowledge.getIds()
    ]));

    if (mergedVolatileKnowledgeIds.length === 0) return;

    body.push({
      Key: "volatileKnowledgeIds",
      Value: mergedVolatileKnowledgeIds,
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
