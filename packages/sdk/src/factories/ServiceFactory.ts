import { TranscribeAudioManager } from "../utils/TranscribeAudioManager";
import {
  TranscribeAudioOptions,
  TranscribeAudioResult,
} from "../types";

export class ServiceFactory {
  static createService<T extends ServiceType>(
    type: T,
    apiKey: string,
    baseUrl: string
  ): ServiceTypeMap[T] {
    switch (type) {
      case "audio": {
        const transcribeManager = new TranscribeAudioManager(baseUrl, apiKey);
        return {
          /**
           * Transcribe an audio file using the Serenity API.
           *
           * @param file - The audio file to transcribe
           * @param options - Optional configuration for transcription
           * @returns Transcription result with transcript, metadata, token usage, and cost information
           *
           * @example
           * ```typescript
           * const result = await client.services.audio.transcribe(audioFile, {
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
          transcribe: (
            file: File,
            options?: TranscribeAudioOptions
          ): Promise<TranscribeAudioResult> => {
            return transcribeManager.transcribe(file, options);
          },
        } as ServiceTypeMap[T];
      }
      default:
        throw new Error(`Service type ${type} not supported`);
    }
  }
}

export type ServiceType = "audio";

export type AudioServiceScope = {
  /**
   * Transcribe an audio file using the Serenity API.
   *
   * @param file - The audio file to transcribe
   * @param options - Optional configuration for transcription
   * @returns Transcription result with transcript, metadata, token usage, and cost information
   *
   * @example
   * ```typescript
   * const result = await client.services.audio.transcribe(audioFile, {
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
  transcribe: (
    file: File,
    options?: TranscribeAudioOptions
  ) => Promise<TranscribeAudioResult>;
};

type ServiceTypeMap = {
  audio: AudioServiceScope;
};
