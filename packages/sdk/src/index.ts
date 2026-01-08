import "./polyfill";
import { Conversation } from "./scopes/conversational/Conversation";
import {
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
import SerenityClient from "./SerenityClient";
import {
  AgentResult,
  BaseErrorBody,
  FileError,
  PendingAction,
  RateLimitErrorBody,
  ValidationErrorBody,
  VolatileKnowledgeUploadOptions,
  VolatileKnowledgeUploadRes,
} from "./types";
import { ExternalErrorHelper } from "./utils/ErrorHelper";
import { VolatileKnowledgeManager } from "./utils/VolatileKnowledgeManager";

export { SerenityClient, RealtimeSession, ExternalErrorHelper as ErrorHelper, VolatileKnowledgeManager };
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
  FileError
};
