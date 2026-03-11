import {
  TranscribeAudioOptions,
  TranscribeAudioResult,
  FileUploadRes,
} from "../types";
import { InternalErrorHelper } from "./ErrorHelper";

/**
 * Supported audio MIME types for Gemini API
 */
const SUPPORTED_AUDIO_MIME_TYPES: Record<string, string> = {
  'wav': 'audio/wav',
  'mp3': 'audio/mp3',
  'aiff': 'audio/aiff',
  'aif': 'audio/aiff',
  'aac': 'audio/aac',
  'ogg': 'audio/ogg',
  'flac': 'audio/flac',
  'mpeg': 'audio/mpeg',
  'm4a': 'audio/aac',
};

/**
 * Gets the proper audio MIME type based on file extension or existing type
 */
function getAudioMimeType(file: File): string {
  // Strip codec information from MIME type (e.g., "audio/webm;codecs=opus" -> "audio/webm")
  const cleanType = file.type.split(';')[0].trim();
  
  // If the file already has a valid audio MIME type, use it
  if (cleanType && cleanType.startsWith('audio/') && cleanType !== 'application/octet-stream') {
    return cleanType;
  }

  // Try to determine MIME type from file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && SUPPORTED_AUDIO_MIME_TYPES[extension]) {
    return SUPPORTED_AUDIO_MIME_TYPES[extension];
  }

  // Default fallback - try mp3 as it's most common
  return 'audio/mp3';
}

/**
 * Manages audio transcription and file uploads.
 * Provides methods to transcribe audio files and upload them to the platform.
 */
export class TranscribeAudioManager {
  public audioFileId: string | null = null;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  /**
   * Transcribe an audio file using the Serenity API.
   *
   * @param file - The audio file to transcribe
   * @param options - Optional configuration for transcription
   * @returns Transcription result with transcript, metadata, token usage, and cost information
   *
   * @example
   * ```typescript
   * const result = await transcribeAudio.transcribe(audioFile, {
   *   modelId: '[YOUR_MODEL_ID]',
   *   prompt: 'This is a conversation about AI',
   *   userIdentifier: 'user123'
   * });
   *
   * console.log('Transcript:', result.transcript);
   * console.log('Duration:', result.metadata?.duration);
   * console.log('Total tokens:', result.tokenUsage?.totalTokens);
   * console.log('Cost:', result.cost?.total, result.cost?.currency);
   * ```
   */
  async transcribe(
    file: File,
    options?: TranscribeAudioOptions
  ): Promise<TranscribeAudioResult> {
    const url = `${this.baseUrl}/audio/transcribe`;

    const formData = new FormData();
    
    // Ensure the file has the correct MIME type
    const mimeType = getAudioMimeType(file);
    const audioFile = new File([file], file.name, { type: mimeType });
    
    formData.append("file", audioFile);

    if (options?.modelId) {
      formData.append("modelId", options.modelId);
    }
    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }
    if (options?.userIdentifier) {
      formData.append("userIdentifier", options.userIdentifier);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "X-API-KEY": this.apiKey,
        },
      });

      if (!response.ok) {
        throw await InternalErrorHelper.process(
          response,
          "Failed to transcribe audio file"
        );
      }

      const data = (await response.json()) as TranscribeAudioResult;
      return data;
    } catch (error) {
      throw error;
    }
  }
}
