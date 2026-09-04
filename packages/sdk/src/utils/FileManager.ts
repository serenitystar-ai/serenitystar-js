import { FileUploadOptions, FileUploadRes } from "../types";
import { InternalErrorHelper } from "./ErrorHelper";
import { AuthProvider } from "../auth/AuthProvider";
import { fetchWithAuth } from "./fetchWithAuth";
import { getMimeType } from "./mime";

export class FileManager {
  baseUrl: string;
  authProvider: AuthProvider;

  constructor(baseUrl: string, authProvider: AuthProvider) {
    this.baseUrl = baseUrl;
    this.authProvider = authProvider;
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
    const mimeType = getMimeType(fileName, fileBlob.type);
    const fileToUpload = mimeType !== fileBlob.type 
      ? new Blob([fileBlob], { type: mimeType })
      : fileBlob;
    
    formData.append("formFile", fileToUpload, fileName);

    try {
      const response = await fetchWithAuth(this.authProvider, url, {
        method: "POST",
        body: formData,
        headers: {},
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

  /**
   * Download a file using an authenticated request.
   *
   * @param downloadUrl - Absolute or relative file download URL
   * @returns The downloaded file as a Blob
   */
  async download(downloadUrl: string): Promise<Blob> {
    const normalizedUrl = downloadUrl.startsWith("http")
      ? downloadUrl
      : `${this.baseUrl}${downloadUrl.startsWith("/") ? "" : "/"}${downloadUrl}`;

    const response = await fetchWithAuth(this.authProvider, normalizedUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw await InternalErrorHelper.process(response, "Failed to download file");
    }

    return await response.blob();
  }
}
