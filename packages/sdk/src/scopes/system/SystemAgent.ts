import { EventEmitter } from "../../EventEmitter";
import { AgentResult, ExecuteBodyParams, FileUploadRes, SSEStreamEvents } from "../../types";
import { AgentMapper } from "../../utils/AgentMapper";
import { InternalErrorHelper } from "../../utils/ErrorHelper";
import { VolatileKnowledgeManager } from "../../utils/VolatileKnowledgeManager";
import { FileManager } from "../../utils/FileManager";
import { SseConnection } from "../conversational/Conversation/SseConnection";
import { parseStreamStart } from "../conversational/Conversation/parseStreamStart";
import { SystemAgentExecutionOptionsMap } from "./../../types";
import { AuthProvider } from "../../auth/AuthProvider";
import { fetchWithAuth } from "../../utils/fetchWithAuth";

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
    protected readonly authProvider: AuthProvider,
    protected readonly baseUrl: string,
    protected readonly options?: SystemAgentExecutionOptionsMap[T]
  ) {
    super();
    this.volatileKnowledge = new VolatileKnowledgeManager(baseUrl, authProvider, agentCode);
    this.fileManager = new FileManager(baseUrl, authProvider);
  }

  /**
   * Stops the current streaming response, aborting the SSE connection.
   * If no stream is active, this method does nothing.
   *
   * The pending `stream` promise resolves with `aborted: true` and the content streamed so
   * far. It does not reject.
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
      this.connection.abort();
      this.connection = null;
    }
  }

  async stream(): Promise<AgentResult> {
    const body = this.createExecuteBody(true);
    return this.#streamRequest(body, "Failed to send message");
  }

  async streamWithAudio(audio: Blob): Promise<AgentResult> {
    let uploadResult: FileUploadRes;
    try {
      uploadResult = await this.fileManager.upload(audio, {
        fileName: `audio_input_${Date.now()}.webm`,
      });
    } catch (error) {
      throw await InternalErrorHelper.process(error, "Failed to upload audio file or stream audio message");
    }
    uploadResult.downloadUrl = `${this.baseUrl}/file/download/${uploadResult.id}`;
    const body = this.createExecuteBody(true, { fileId: uploadResult.id });
    // Outside the upload's catch: a streamed error frame has no statusCode and would be
    // flattened into a generic 500.
    return this.#streamRequest(body, "Failed to send audio message", uploadResult);
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

    const response = await fetchWithAuth(this.authProvider, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    const connection = new SseConnection();
    this.connection = connection;

    let content = "";
    let instanceId: string | undefined;

    return new Promise<AgentResult>((resolve, reject) => {
      connection.on("start", (data) => {
        const start = parseStreamStart(data);
        instanceId = start.instance_id;
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

      connection.on("stop", (data) => {
        const finalMessage = JSON.parse(data) as { result: AgentResult };

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
            instance_id: instanceId ?? "",
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
    const version = this.options?.agentVersion
      ? `/${this.options.agentVersion}`
      : "";
    return `${this.baseUrl}/v2/agent/${this.agentCode}/execute${version}`;
  }
}
