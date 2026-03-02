import { EventEmitter } from "../../EventEmitter";
import { AgentResult, ExecuteBodyParams, FileUploadRes, SSEStreamEvents } from "../../types";
import { AgentMapper } from "../../utils/AgentMapper";
import { InternalErrorHelper } from "../../utils/ErrorHelper";
import { VolatileKnowledgeManager } from "../../utils/VolatileKnowledgeManager";
import { FileManager } from "../../utils/FileManager";
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
  private readonly fileManager: FileManager;
  private connection: SseConnection | null = null;

  protected constructor(
    protected readonly agentCode: string,
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
    protected readonly options?: SystemAgentExecutionOptionsMap[T]
  ) {
    super();
    this.volatileKnowledge = new VolatileKnowledgeManager(baseUrl, apiKey);
    this.fileManager = new FileManager(baseUrl, apiKey);
  }

  /**
   * Stops the current streaming response, aborting the SSE connection.
   * If no stream is active, this method does nothing.
   *
   * @example
   * ```typescript
   * agent.on("content", (chunk) => {
   *   if (shouldStop) {
   *     agent.stop();
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

  async stream(): Promise<AgentResult> {
    const body = this.createExecuteBody(true);
    return this.#streamRequest(body, "Failed to send message");
  }

  async streamWithAudio(audio: Blob): Promise<AgentResult> {
    try {
      let uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
      uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;
      const body = this.createExecuteBody(true, { fileId: uploadResult.id });
      return await this.#streamRequest(body, "Failed to send audio message", uploadResult);
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or stream audio message");
    }
  }

  protected async execute(): Promise<AgentResult> {
    const body = this.createExecuteBody(false);
    return this.#executeRequest(body, "Failed to send message");
  }

  async executeWithAudio(audio: Blob): Promise<AgentResult> {
    try {
      let uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
      uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;
      const body = this.createExecuteBody(false, { fileId: uploadResult.id });
      return await this.#executeRequest(body, "Failed to send audio message", uploadResult);
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or execute audio message");
    }
  }

  protected createExecuteBody(
    stream: boolean,
    audio?: { fileId: string }
  ): ExecuteBodyParams | { [key: string]: any } {
    let body: ExecuteBodyParams = [
      {
        Key: "stream",
        Value: stream.toString(),
      },
    ];

    if (audio) {
      body.push({
        Key: "audioInput",
        Value: audio,
      });
    }

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

  async #executeRequest(
    body: ExecuteBodyParams | { [key: string]: any },
    errorMessage: string,
    audioUploadResult?: FileUploadRes
  ): Promise<AgentResult> {
    const url = this.#getExecuteUrl();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      const error = await InternalErrorHelper.process(response, errorMessage);
      throw error;
    }

    const data = await response.json();
    const mappedData = AgentMapper.mapAgentResultToSnakeCase(data);
    
    this.volatileKnowledge.clear();
    return mappedData;
  }

  async #streamRequest(
    body: ExecuteBodyParams | { [key: string]: any },
    errorMessage: string,
    audioUploadResult?: FileUploadRes
  ): Promise<AgentResult> {
    const url = this.#getExecuteUrl();
    this.connection = new SseConnection();

    return new Promise(async (resolve, reject) => {
      if (!this.connection) {
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
        this.emit("content", chunk.text);
      });

      this.connection.on("stop", (data) => {
        const finalMessage = JSON.parse(data) as { result: AgentResult };
        
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
    const version = this.options?.agentVersion
      ? `/${this.options.agentVersion}`
      : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
  }
}
