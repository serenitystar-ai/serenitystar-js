import { ExecuteBodyParams } from "../../../types";

export type InitConversationResponse = {
  chatId: string;
  content: string;
  conversationStarters?: string[];
  useVision?: boolean;
}

export type InitConversationParams = {
  inputParameters?: ExecuteBodyParams;
  userIdentifier?: string;
};

export type MessageOptions = {
  inputParameters?: { [key: string]: any }
  volatileKnowledgeIds?: string[]
}