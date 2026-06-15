import {
  VolatileKnowledgeUploadFromBase64Options,
  VolatileKnowledgeUploadFromFileIdOptions,
  VolatileKnowledgeUploadFromUrlOptions,
  VolatileKnowledgeUploadOptions,
  VolatileKnowledgeUploadRes,
} from "../types";
import { InternalErrorHelper } from "./ErrorHelper";
import { AuthProvider } from "../auth/AuthProvider";
import { fetchWithAuth } from "./fetchWithAuth";
import { getMimeType, normalizeMimeType } from "./mime";

/**
 * Manages volatile knowledge files for agent instances.
 * Provides methods to upload, remove, and clear files.
 */
export class VolatileKnowledgeManager {
  private ids: string[] = [];

  constructor(
    private readonly baseUrl: string,
    private readonly authProvider: AuthProvider,
    private readonly agentCode: string,
  ) {
    if (!agentCode || !agentCode.trim()) {
      throw new Error(
        "VolatileKnowledgeManager requires an agentCode for agent-scoped volatile knowledge endpoints.",
      );
    }
  }

  private get volatileKnowledgeUrl(): string {
    return `${this.baseUrl}/v2/agent/${encodeURIComponent(this.agentCode)}/volatileKnowledge`;
  }

  private get oldVolatileKnowledgeUrl(): string {
    return `${this.baseUrl}/v2/volatileKnowledge`;
  }

  /**
   * Get the MIME types supported by the current agent for volatile knowledge uploads.
   */
  async getSupportedMimeTypes(): Promise<string[]> {
    const response = await fetchWithAuth(
      this.authProvider,
      `${this.volatileKnowledgeUrl}/mime-types`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw await InternalErrorHelper.process(
        response,
        "Failed to fetch supported volatile knowledge MIME types.",
      );
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(
        "Failed to fetch supported volatile knowledge MIME types.",
      );
    }

    return data.map((mimeType) => String(mimeType));
  }

  /**
   * Upload a file to be used as volatile knowledge in the next agent execution.
   * The file will be automatically included in subsequent messages/executions until cleared.
   *
   * @param file - The file to upload
   * @param options - Optional configuration for file processing
   * @returns Upload result with file details or errors
   *
   * @example
   * ```typescript
   * const uploadResult = await conversation.volatileKnowledge.upload(file);
   *
   * if (uploadResult.success) {
   *   console.log('File uploaded:', uploadResult.id);
   * } else {
   *   console.error('Upload failed:', uploadResult.error);
   * }
   * ```
   */
  async upload(
    file: File,
    options: VolatileKnowledgeUploadOptions = {},
  ): Promise<VolatileKnowledgeUploadRes> {
    const mimeType = getMimeType(file.name, file.type);

    try {
      const fileToUpload =
        normalizeMimeType(file.type) === mimeType
          ? file
          : new Blob([file], { type: mimeType });

      const formData = new FormData();
      formData.append("file", fileToUpload, file.name);

      const queryParams = new URLSearchParams();
      if (options.noExpiration !== undefined) {
        queryParams.append("noExpiration", options.noExpiration.toString());
      }
      if (options.expirationDays !== undefined) {
        queryParams.append("expirationDays", options.expirationDays.toString());
      }
      let processEmbeddings = options.processEmbeddings;
      if (processEmbeddings === undefined && mimeType.startsWith("image/")) {
        processEmbeddings = !options.useVision;
      }
      if (processEmbeddings !== undefined) {
        queryParams.append("processEmbeddings", processEmbeddings.toString());
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `${this.volatileKnowledgeUrl}?${queryString}`
        : this.volatileKnowledgeUrl;

      const response = await fetchWithAuth(this.authProvider, url, {
        method: "POST",
        body: formData,
        headers: {},
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            file,
            error: new Error(
              InternalErrorHelper.processFile(response.status, file, data),
            ),
          },
        };
      }

      if (data.id && !this.ids.includes(data.id)) {
        this.ids.push(data.id);
      }

      return {
        success: true,
        id: data.id,
        expirationDate: data.expirationDate,
        status: data.status,
        fileName: data.fileName || file.name,
        fileSize: data.fileSize ?? file.size,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          file,
          error: new Error(InternalErrorHelper.processFile(500, file, {})),
        },
      };
    }
  }

  /**
   * Create volatile knowledge from an existing platform file ID.
   */
  async uploadFromFileId(
    fileId: string,
    options: VolatileKnowledgeUploadFromFileIdOptions = {},
  ): Promise<VolatileKnowledgeUploadRes> {
    if (!fileId) {
      return {
        success: false,
        error: { error: new Error("fileId is required.") },
      };
    }

    return this.uploadJson(`${this.volatileKnowledgeUrl}/upload/file`, {
      fileId,
      callbackUrl: options.callbackUrl,
      noExpiration: options.noExpiration,
      expirationDays: options.expirationDays,
      processEmbeddings: options.processEmbeddings,
    });
  }

  /**
   * Create volatile knowledge from a remote URL.
   */
  async uploadFromUrl(
    fileUrl: string,
    options: VolatileKnowledgeUploadFromUrlOptions = {},
  ): Promise<VolatileKnowledgeUploadRes> {
    if (!fileUrl) {
      return {
        success: false,
        error: { error: new Error("fileUrl is required.") },
      };
    }

    return this.uploadJson(`${this.volatileKnowledgeUrl}/upload/url`, {
      fileUrl,
      fileName: options.fileName,
      callbackUrl: options.callbackUrl,
      noExpiration: options.noExpiration,
      expirationDays: options.expirationDays,
      processEmbeddings: options.processEmbeddings,
    });
  }

  /**
   * Create volatile knowledge from a base64-encoded file.
   */
  async uploadFromBase64(
    contentBase64: string,
    options: VolatileKnowledgeUploadFromBase64Options,
  ): Promise<VolatileKnowledgeUploadRes> {
    if (!contentBase64) {
      return {
        success: false,
        error: { error: new Error("contentBase64 is required.") },
      };
    }
    if (!options?.fileName) {
      return {
        success: false,
        error: { error: new Error("fileName is required.") },
      };
    }
    if (!options?.mimeType) {
      return {
        success: false,
        error: { error: new Error("mimeType is required.") },
      };
    }

    const mimeType = getMimeType(options.fileName, options.mimeType);

    return this.uploadJson(`${this.volatileKnowledgeUrl}/upload/base64`, {
      fileName: options.fileName,
      mimeType,
      contentBase64: contentBase64,
      callbackUrl: options.callbackUrl,
      noExpiration: options.noExpiration,
      expirationDays: options.expirationDays,
      processEmbeddings: options.processEmbeddings,
    });
  }

  /**
   * Remove a specific volatile knowledge file by its ID.
   *
   * @param fileId - The ID of the file to remove
   * @returns True if the file was removed, false otherwise
   *
   * @example
   * ```typescript
   * const uploadResult = await conversation.volatileKnowledge.upload(file);
   *
   * if (uploadResult.success) {
   *   // Remove the file from the queue
   *   conversation.volatileKnowledge.removeById(uploadResult.id);
   * }
   * ```
   */
  removeById(fileId: string): boolean {
    const index = this.ids.indexOf(fileId);
    if (index > -1) {
      this.ids.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all volatile knowledge files from the queue.
   *
   * @example
   * ```typescript
   * await conversation.volatileKnowledge.upload(file1);
   * await conversation.volatileKnowledge.upload(file2);
   *
   * // Clear all files from the queue
   * conversation.volatileKnowledge.clear();
   * ```
   */
  clear(): void {
    this.ids = [];
  }

  /**
   * Get all volatile knowledge file IDs currently in the queue.
   * @internal
   */
  getIds(): string[] {
    return [...this.ids];
  }

  /**
   * Fetch details of a volatile knowledge file by its ID.
   * @param fileId - The ID of the file to fetch
   * @returns The file details or an error
   */
  async getById(fileId: string): Promise<VolatileKnowledgeUploadRes> {
    const url = `${this.oldVolatileKnowledgeUrl}/${fileId}`;

    const result = await fetchWithAuth(this.authProvider, url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await result.json();

    if (!result.ok) {
      return {
        success: false,
        error: {
          error: new Error(
            data.message || "Failed to fetch volatile knowledge file.",
          ),
        },
      };
    }

    return {
      success: true,
      ...data,
    };
  }

  /**
   * Shared JSON upload flow for the file/url/base64 endpoints.
   * `JSON.stringify` already drops `undefined` values, so the caller can pass the body as-is.
   */
  private async uploadJson(
    url: string,
    body: { [key: string]: any },
  ): Promise<VolatileKnowledgeUploadRes> {
    try {
      const response = await fetchWithAuth(this.authProvider, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: {
            error: new Error(
              data?.message ||
                "An unknown error occurred while uploading the file.",
            ),
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          error:
            error instanceof Error
              ? error
              : new Error(
                  "An unknown error occurred while uploading the file.",
                ),
        },
      };
    }
  }
}
