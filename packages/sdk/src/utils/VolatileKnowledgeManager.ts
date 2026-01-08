import {
  VolatileKnowledgeUploadOptions,
  VolatileKnowledgeUploadRes,
} from "../types";
import { InternalErrorHelper } from "./ErrorHelper";

/**
 * Manages volatile knowledge files for agent instances.
 * Provides methods to upload, remove, and clear files.
 */
export class VolatileKnowledgeManager {
  private ids: string[] = [];

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

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
    options: VolatileKnowledgeUploadOptions = {
      useVision: false,
      processEmbeddings: false,
    }
  ): Promise<VolatileKnowledgeUploadRes> {
    const url = `${this.baseUrl}/v2/volatileKnowledge`;

    const formData = new FormData();
    formData.append("file", file);

    const queryParams = new URLSearchParams();

    if (!options?.processEmbeddings) {
      // Check if useVision is enabled and the file is an image
      const isImageFile = file.type.startsWith("image/");
      if (isImageFile) {
        queryParams.append(
          "processEmbeddings",
          (!options.useVision).toString()
        );
      }
    }

    try {
      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: "POST",
        body: formData,
        headers: {
          contentType: "multipart/form-data",
          "X-API-KEY": this.apiKey,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            file: file,
            error: new Error(
              InternalErrorHelper.processFile(
                response.status,
                file,
                data,
                options.locale?.uploadFileErrorMessage
              )
            ),
          },
        };
      } else {
        // Store file id in volatileKnowledgeIds to be included in next message
        if (!this.ids.includes(data.id)) {
          this.ids.push(data.id);
        }

        return {
          success: true,
          id: data.id,
          expirationDate: data.expirationDate,
          status: data.status,
          fileName: file.name,
          fileSize: data.fileSize,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          file: file,
          error: new Error(
            InternalErrorHelper.processFile(
              500,
              file,
              {},
              options.locale?.uploadFileErrorMessage
            )
          ),
        },
      };
    }
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
    const url = `${this.baseUrl}/v2/volatileKnowledge/${fileId}`;

    const result = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
    });

    const data = await result.json();

    if (!result.ok) {
      return {
        success: false,
        error: {
          error: new Error(
            data.message || "Failed to fetch volatile knowledge file."
          ),
        },
      };
    }

    return {
      success: true,
      ...data,
    };
  }
}
