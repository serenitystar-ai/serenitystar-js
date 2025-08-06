import "./polyfill";
import { ChatWidgetRes, ConversationInfoResult, ConversationRes } from "./scopes/conversational/Conversation/types";
import { RealtimeSession } from "./scopes/conversational/RealtimeSession";
import SerenityClient from "./SerenityClient";
import { AgentResult } from "./types";

export { SerenityClient, RealtimeSession };

export type { AgentResult, ConversationRes, ConversationInfoResult, ChatWidgetRes };
