import { ExecuteBodyParams, VolatileKnowledgeUploadRes } from "../../../types";

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

// -------------------------------------------
// *** Types for Chat Widget Configuration ***
// -------------------------------------------

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
  enableFeedbackRecollection: boolean;
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

// -------------------------------------------
// *** Types for Conversation details ***
// -------------------------------------------

export type ConversationRes = {
  startDate: string;
  endDate: string;
  id: string;
  messages: Message[];
  name: string;
  userIdentifier?: string;
  useVision?: boolean;
  conversationStarters?: string[];
  open?: boolean;
};

export type Message = (
  | {
      sender: "user";
    }
  | {
      sender: "bot";
      conversationStarters?: string[];
    }
) & {
  id: string;
  created_at: Date;
  type: "text" | "image" | "error" | "info";
  value: string;
  attachments?: VolatileKnowledgeUploadRes[] | AttachedVolatileKnowledge[];
  meta_analysis?: MetaAnalysisRes;
  completion_usage?: CompletionUsageRes;
  time_to_first_token?: number;
  executor_task_logs?: ExecutorTaskLogsRes;
  attached_volatile_knowledges?: AttachedVolatileKnowledge[];
  action_results?: {
    [key: string]: PluginExecutionResult
  }
};

type PluginExecutionResult = SpeechGenerationResult

export type SpeechGenerationResult = {
  content: string;
  finish_reason?: string;
  usage?: object;
}

export type AttachedVolatileKnowledge = {
  id: string;
  expirationDate: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
};

export type CompletionUsageRes = {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
};

export type ExecutorTaskLogsRes = {
  description: string;
  duration: number;
}[];

export type MetaAnalysisRes = { [key: string]: any } & {
  policy_compliance?: {
    compliance_score?: number;
    explanation?: string;
    policy_violations?: {
      source_id?: string;
      source_document_name: string;
      chunk_id?: string;
      section_number?: string;
      section?: string;
      policy?: string;
      policy_name: string;
      policy_id?: string;
    }[];
  };
  pii_release_risk?: {
    risk_score?: number;
    explanation?: string;
  };
  ethics?: {
    score?: number;
    explanation?: string;
    avoid_topics?: {
      topic: string;
      reason: string;
    }[];
  };
  deception_estimation?: {
    deception_score?: number;
    explanation?: string;
  };
  cybersecurity_threat?: {
    threat_assessment?: number;
    explanation?: string;
  };
  social_content_risk?: {
    risk_score?: number;
    explanation?: string;
  };
  conversation_analysis?: {
    emotion_value_estimate?: number;
    predicted_next_goal?: string;
    attended_to_features?: string[];
    topic_area?: string;
  };
  guardrails_compliance?: {
    explanation?: string;
    investment_score?: number;
    legal_score?: number;
    medical_score?: number;
    tax_score?: number;
  }
};

// -------------------------------------------
// *** Types for Message Feedback ***
// -------------------------------------------

export type SubmitFeedbackOptions = {
  /**
   * The ID of the agent message to provide feedback for
   */
  agentMessageId: string;
  /**
   * The feedback value - true for positive, false for negative
   */
  feedback: boolean;
};

export type SubmitFeedbackResult = {
  /**
   * Indicates if the feedback was successfully submitted
   */
  success: boolean;
};

export type RemoveFeedbackOptions = {
  /**
   * The ID of the agent message to remove feedback from
   */
  agentMessageId: string;
};

export type RemoveFeedbackResult = {
  /**
   * Indicates if the feedback was successfully removed
   */
  success: boolean;
};

// -------------------------------------------
// *** Types for Connector Status ***
// -------------------------------------------

export type GetConnectorStatusOptions = {
  /**
   * The agent instance identifier (conversation ID)
   */
  agentInstanceId: string;
  /**
   * The connector identifier
   */
  connectorId: string;
};

export type ConnectorStatusResult = {
  /**
   * Indicates if the connector is connected
   */
  isConnected: boolean;
};