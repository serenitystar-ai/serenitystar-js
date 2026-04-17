import "./polyfill";
import { Conversation } from "./scopes/conversational/Conversation";
import {
  AttachedVolatileKnowledgeRes,
  ChatWidgetRes,
  ConnectorStatusResult,
  ConversationInfoResult,
  ConversationRes,
  GetConnectorStatusOptions,
  Message,
  RemoveFeedbackOptions,
  RemoveFeedbackResult,
  SubmitFeedbackOptions,
  SubmitFeedbackResult,
} from "./scopes/conversational/Conversation/types";
import { RealtimeSession } from "./scopes/conversational/RealtimeSession";
import { SerenityClient, FullSerenityClient, ScopedSerenityClient } from "./SerenityClient";
import type { FullAgents, FullServices, ScopedAgents } from "./SerenityClient";
import {
  AgentResult,
  BaseErrorBody,
  FileError,
  PendingAction,
  RateLimitErrorBody,
  ValidationErrorBody,
  VolatileKnowledgeUploadOptions,
  VolatileKnowledgeUploadRes,
  TranscribeAudioOptions,
  TranscribeAudioResult,
  FileUploadRes,
  TokenProviderFn,
  TokenProviderContext,
  AgentClientCredentials,
} from "./types";
import { ExternalErrorHelper } from "./utils/ErrorHelper";
import { VolatileKnowledgeManager } from "./utils/VolatileKnowledgeManager";
import { AuthProvider } from "./auth/AuthProvider";

export { SerenityClient, FullSerenityClient, ScopedSerenityClient, RealtimeSession, ExternalErrorHelper as ErrorHelper, VolatileKnowledgeManager };
export type {
  AgentResult,
  ConversationRes,
  ConversationInfoResult,
  ChatWidgetRes,
  BaseErrorBody,
  RateLimitErrorBody,
  ValidationErrorBody,
  Conversation,
  Message,
  SubmitFeedbackOptions,
  SubmitFeedbackResult,
  RemoveFeedbackOptions,
  RemoveFeedbackResult,
  GetConnectorStatusOptions,
  ConnectorStatusResult,
  PendingAction,
  VolatileKnowledgeUploadOptions,
  VolatileKnowledgeUploadRes,
  FileError,
  TranscribeAudioOptions,
  TranscribeAudioResult,
  FileUploadRes,
  AttachedVolatileKnowledgeRes,
  TokenProviderFn,
  TokenProviderContext,
  AgentClientCredentials,
  AuthProvider,
  FullAgents,
  FullServices,
  ScopedAgents,
};
