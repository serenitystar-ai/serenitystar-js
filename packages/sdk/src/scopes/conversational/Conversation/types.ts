import { ExecuteBodyParams } from "../../../types";

export type MessageAdditionalInfo = {
  inputParameters?: { [key: string]: any }
  volatileKnowledgeIds?: string[]
}

export type CreateExecuteBodyOptions = {
  message: string;
  stream: boolean;
  isNewConversation: boolean;
  additionalInfo?: MessageAdditionalInfo;
}

export type ConversationInfoResult = {
  agent: {
    isRealtime: boolean;
    version: number;
    visionEnabled: boolean;
    imageId: string;
  }
  conversation: {
    initialMessage: string;
    starters: string[];
  }
  channel?: ChatWidgetRes;
}

export type ChatWidgetRes = {
  expanded: boolean;
  opened: boolean;
  showExpandButton: boolean;
  allowUpload: boolean;
  allowAudioRecording: boolean;
  storeConversation: boolean;
  stream: boolean;
  extractPageContent: boolean;
  showSystemLogo: boolean;
  userIdentifier: string;
  logoURL: string;
  mode: string;
  engagementMessage: EngagementMessageRes;
  locale: LocaleRes;
  theme: ThemeRes;
}

type EngagementMessageRes = {
  enabled: boolean;
  message: string;
  showAfter: number;
}

type LocaleRes = {
  uploadFileErrorMessage: string;
  uploadFilesErrorMessage: string;
  chatErrorMessage: string;
  chatInitConversationErrorMessage: string;
  headerTitle: string;
  finalizedMessage: string;
  limitExceededMessage: string;
  waitUntilMessage: string;
  remainingMessage: string;
  inputPlaceholder: string;
  internalLinkMessage: string;
  newChatBtnMessage: string;
  exceededMaxNumberOfFilesMessage: string;
  exceededMaxFileStatusChecksMessage: string;
  closedConversationMessage: string;
}

type ThemeRes = {
  header: HeaderThemeRes;
  fabButton: FabButtonThemeRes;
  sendButton: SendButtonThemeRes;
  engagementMessage: EngagementMessageThemeRes;
  conversationStarters: ConversationStartersThemeRes;
  scrollToBottomIndicator: ScrollToBottomIndicatorThemeRes;
  uploadFileBtn: UploadFileBtnThemeRes;
  messageBubble: MessageBubbleThemeRes;
}

// Theme component types
type HeaderThemeRes = {
  bgColor: string;
  textColor: string;
  resetChatBtn: ResetChatBtnThemeRes;
  minimizeBtn: MinimizeBtnThemeRes;
}

type FabButtonThemeRes = {
  bgColor: string;
  iconStrokeColor: string;
  buttonSize: number;
  iconSize: number;
}

type SendButtonThemeRes = {
  bgColor: string;
  iconStrokeColor: string;
}

type EngagementMessageThemeRes = {
  bgColor: string;
  textColor: string;
}

type ConversationStartersThemeRes = {
  bgColor: string;
  textColor: string;
  containerBgColor: string;
  initialMessageBgColor: string;
  initialMessageTextColor: string;
}

type ScrollToBottomIndicatorThemeRes = {
  bgColor: string;
  iconStrokeColor: string;
}

type UploadFileBtnThemeRes = {
  iconStrokeColor: string;
}

type MessageBubbleThemeRes = {
  user: UserThemeRes;
  assistant: AssistantThemeRes;
}

// Additional theme types referenced by other components
type ResetChatBtnThemeRes = {
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
}

type MinimizeBtnThemeRes = {
  iconStrokeColor: string;
}

type UserThemeRes = {
  bgColor: string;
  textColor: string;
}

type AssistantThemeRes = {
  bgColor: string;
  textColor: string;
}