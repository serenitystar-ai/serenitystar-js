import { FileUploadOptions, FileUploadRes } from "../types";
import { InternalErrorHelper } from "./ErrorHelper";

export class FileManager {
  baseUrl: string;
  apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Detects the MIME type from a file name or uses a default.
   * @param fileName - The name of the file
   * @param currentType - The current MIME type of the blob
   * @returns The appropriate MIME type
   */
  private getMimeType(fileName: string, currentType: string): string {
    // Strip codec information from MIME type (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    const cleanType = currentType.split(';')[0].trim();
    
    // If we already have a specific type (not generic), use it
    if (cleanType && cleanType !== 'application/octet-stream') {
      return cleanType;
    }

    // Map common file extensions to MIME types
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const mimeTypeMap: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',

      // Audio
      'mp3': 'audio/mp3',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'aiff': 'audio/aiff',
      'm4a': 'audio/mp4',
      
      // Documents
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
    };

    return mimeTypeMap[extension] || 'application/octet-stream';
  }

  /**
   * Upload a file to the platform.
   *
   * @param fileBlob - The file blob to upload
   * @param options - Optional upload configuration
   * @returns Upload result with file ID and download URL
   *
   * @example
   * ```typescript
   * const result = await fileManager.upload(fileBlob, { fileName: 'document.pdf' });
   * console.log('File ID:', result.id);
   * console.log('Download URL:', result.downloadUrl);
   * ```
   */
  async upload(fileBlob: Blob, options?: FileUploadOptions): Promise<FileUploadRes> {
    const url = options?.public ? `${this.baseUrl}/file/upload/public` : `${this.baseUrl}/file/upload`;

    const formData = new FormData();
    const fileName = options?.fileName || `file_${Date.now()}`;
    
    // Ensure proper MIME type is set
    const mimeType = this.getMimeType(fileName, fileBlob.type);
    const fileToUpload = mimeType !== fileBlob.type 
      ? new Blob([fileBlob], { type: mimeType })
      : fileBlob;
    
    formData.append("formFile", fileToUpload, fileName);

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "X-API-KEY": this.apiKey,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw await InternalErrorHelper.process(
          response,
          "Failed to upload file"
        );
      }

      const data = await response.json();
      return {
        id: data.id,
        downloadUrl: data.downloadUrl,
      };
    } catch (error) {
      throw error;
    }
  }
}
