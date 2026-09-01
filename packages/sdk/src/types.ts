import { ProxyExecutionOptions } from "./scopes/system/types";

/** Context passed to the tokenProvider callback */
export type TokenProviderContext = {
  publicKey: string;
  /** The base URL of the Serenity API */
  baseUrl: string;
  /** The agent code this token is scoped to */
  agentCode: string;
};

/** The tokenProvider function signature */
export type TokenProviderFn = (params: {
  context: TokenProviderContext;
}) => Promise<string>;

/** Agent Client Credentials — scoped to a single agent */
export type AgentClientCredentials = {
  /** The agent this credential is scoped to */
  agentCode: string;
  /** The public key issued for this agent */
  publicKey: string;
  /** Callback to obtain a client token from your backend */
  tokenProvider: TokenProviderFn;
};

/** API Key auth mode — full access */
export type ApiKeyClientOptions = {
  apiKey: string;
  agentClientCredentials?: never;
  baseUrl?: string;
};

/** Agent Client Credentials auth mode — scoped to one agent */
export type AgentClientCredentialsOptions = {
  apiKey?: never;
  agentClientCredentials: AgentClientCredentials;
  baseUrl?: string;
};

/**
 * Options for configuring the Serenity client.
 */
export type SerenityClientOptions =
  | ApiKeyClientOptions
  | AgentClientCredentialsOptions;

export type AgentType = 'assistant' | 'copilot' | 'proxy' | 'activity' | 'chat-completion';

/**
 * Base options for setting up an agent.
*/
export type AgentSetupOptions = {
  /**
   * Optional identifier for the user initiating the execution.
   */
  userIdentifier?: string;
  /**
   * Optional version number of the agent to execute.
   */
  agentVersion?: number;
  /**
   * Optional channel identifier where the execution is taking place.
   */
  channel?: string;
  /**
   * When true, the SDK will use the agent version defined in the channel configuration
   * (if available) instead of defaulting to the latest version.
   * Only takes effect when a `channel` is provided and no explicit `agentVersion` is set.
   * @default false
   */
  useChannelVersion?: boolean;
  /**
   * Optional key-value pairs of input parameters specific to the agent.
   */
  inputParameters?: { [key: string]: any }
}

/**
 * Base options for executing any type of agent.
 */
export type AgentExecutionOptions = AgentSetupOptions & {
  
  /**
   * Optional array of volatile knowledge IDs to include in the execution context.
   */
  volatileKnowledgeIds?: string[];
};

/**
 * Maps agent types to their specific execution options for conversational agents.
 * 
 * @remarks
 * Both assistant and copilot agents support input parameters in addition to base execution options.
 */
export type ConversationalAgentExecutionOptionsMap = {
  "assistant": AgentSetupOptions,
  "copilot": AgentSetupOptions,
}

/**
 * Maps agent types to their specific execution options for system agents.
 * 
 * @remarks
 * - Chat-completion agents require message content
 * - Proxy agents have specific proxy execution options
 */
export type SystemAgentExecutionOptionsMap = {
  "activity": AgentExecutionOptions,
  "chat-completion": AgentExecutionOptions & {
      /** The single message content for the chat completion */
      message: string,
      /** Optional array of message objects representing the conversation history */
      messages?: { role: string, content: string }[]
  },
  "proxy": AgentExecutionOptions & ProxyExecutionOptions
}

export type ConnectionPendingAction = {
  type: "connection";
  auth_type: string;
  url: string;
  connector_name: string;
  connector_img_url?: string;
  connector_id?: string;
}

export type ToolApprovalPendingAction = {
  type: "approval";
  /** The only value that must be echoed back to resolve the request. */
  request_id: string;
  /** Id of the underlying function call. Informational. */
  call_id?: string;
  /** User-defined skill code. */
  skill_code?: string;
  /** Plugin/skill type. */
  skill_type?: string;
  /** Tool name — only present when the skill exposes several tools. */
  tool?: string;
  /** Free-form arguments the model wants to call the skill with. */
  arguments?: { [key: string]: unknown };
}

export type UserChoiceOption = {
  id: string;
  title: string;
  description?: string;
}

export type UserChoiceQuestion = {
  id: string;
  /** Short model-authored label, shown as the question's title. Frequently absent. */
  header?: string;
  text: string;
  is_multiselect: boolean;
  options?: UserChoiceOption[];
}

/**
 * A set of questions the agent asked before it can continue.
 *
 * No correlation id, in either direction: the server sends none and mints none. Identity is
 * whatever the client assigns, and the answers are folded into the text of the next user
 * message — so an unanswered set never expires and can be answered on any later turn.
 */
export type UserChoicePendingAction = {
  type: "user_choice";
  questions: UserChoiceQuestion[];
}

/**
 * A pending action attached to an agent result. Discriminated by `type`:
 * `"connection"` requires the user to sign in to a connector, `"approval"`
 * requires the user to approve a gated skill invocation, `"user_choice"` asks
 * the user one or more questions.
 */
export type PendingAction =
  | ConnectionPendingAction
  | ToolApprovalPendingAction
  | UserChoicePendingAction;

/**
 * A user's decision about a single pending tool (skill) approval request.
 * Members are camelCase — they are sent as-is to the execute endpoint.
 */
export type ToolApprovalDecision = {
  /** Must match a pending request's `request_id`. */
  requestId: string;
  approved: boolean;
  /** Optional free text. Omitted entirely when empty. */
  reason?: string;
}

/**
 * The user's answer to one user-choice question, as the execute endpoint expects it.
 * Members are camelCase — they are sent as-is.
 */
export type UserChoiceAnswer = {
  /** Must match a question's `id`. */
  questionId: string;
  selectedOptionIds: string[];
  /** Free text for when no option fits. Omitted entirely when empty. */
  other?: string;
}

export type CitationSource =
  | {
      type: "knowledge_file";
      knowledge_file_version_id?: string;
      section_id?: string;
      file_name?: string;
      page_range?: string;
      /** Whether the cited file can be downloaded by authorized users of the agent. */
      is_downloadable?: boolean;
      /**
       * Absolute URL of the download endpoint for the cited file, or absent when it isn't
       * downloadable. Carries no credentials — the caller must authenticate.
       * Only present on live citations; historical ones (`getConversationById`) omit it.
       */
      download_url?: string;
    }
  | {
      type: "knowledge_website";
      knowledge_file_version_id?: string;
      section_id?: string;
      website: string;
    }
  | {
      type: "web_search";
      url: string;
      title?: string;
    };

export type CitationRes = {
  cited_text: string;
  citation_index: number;
  start_index: number;
  end_index: number;
  relevance?: number;
  source: CitationSource | null;
};

export type CitationResWithoutText = {
  citation_index: number;
  start_index: number;
  end_index: number;
  relevance?: number;
  source: CitationSource | null;
};

export type AgentResult = {
  content: string;
  instance_id: string;
  json_content?: any;
  meta_analysis?: MetaAnalysisRes;
  completion_usage?: CompletionUsageRes;
  time_to_first_token?: number;
  executor_task_logs?: ExecutorTaskLogsRes;
  action_results?: {
    [key: string]: PluginExecutionResult;
  };
  agent_message_id?: string;
  user_message_id?: string;
  pending_actions?: PendingAction[];
  citations?: CitationRes[];
}

/**
 * Fields shared by both task lifecycle events emitted while the agent executes internal
 * tasks such as skills.
 */
export type TaskEventBase = {
  /** The event name, mirroring the SSE event: `task_start` or `task_stop`. */
  type: string;
  /** Human-readable description of the task, e.g. `Executing Skill: GetProductInfo`. */
  task: string;
  /**
   * Identifier of the task being executed, e.g. `skills_GetProductInfo_execute`.
   * Skill executions follow the `skills_<SkillCode>_execute` convention.
   */
  task_key: string;
  start_time_utc?: string;
  /** Details about the executed task. For skills, `skill.code` is the skill code. */
  metadata?: {
    skill?: { type?: string; code?: string };
    [key: string]: any;
  };
  /** Additional fields the server may include are preserved. */
  [key: string]: any;
};

/**
 * Payload of the `task_start` event.
 */
export type TaskStartEvent = TaskEventBase & {
  /** The arguments the task was invoked with. Shape depends on the task. */
  input?: { [key: string]: any };
};

/**
 * Payload of the `task_stop` event.
 */
export type TaskStopEvent = TaskEventBase & {
  end_time_utc?: string;
  /** Elapsed time as a .NET timespan string, e.g. `00:00:00.0002104`. */
  duration?: string;
  /** The task's result. Shape depends on the task. */
  output?: any;
  success?: boolean;
};

/**
 * Represents the events that can occur during a realtime session.
 * 
 * @remarks
 * The SSEStreamEvents type defines all possible events that can be emitted during
 * a Server-Sent Events (SSE) streaming session. These events help track the lifecycle
 * of a streaming response, from initiation to completion, including error handling
 * and data chunk processing.
 * 
 * @example
 * ```typescript
 * const eventHandler = {
 *   start: () => console.log('Stream started'),
 *   content: (chunk) => console.log('Received chunk:', chunk),
 *   error: (error) => console.error('Stream error:', error?.message),
 *   task_start: (task) => console.log('Task started:', task.task_key),
 *   task_stop: (task) => console.log('Task finished:', task.task_key),
 *   stop: (message) => console.log('Stream completed:', message)
 * };
 * 
 * // Using with a stream
 * stream.on('start', eventHandler.start);
 * stream.on('content', eventHandler.content);
 * ```
 */
export type SSEStreamEvents = {
  /**
   * Event triggered when the server starts streaming a new response.
   */
  start: () => void;

  /**
   * Event triggered when an error occurs.
   * @param error - The error object. May contain a message.
   */
  error: (error?: { message?: string }) => void;

  /**
   * Event triggered when there is a new chunk of data available.
   * @param data - The text of the chunk.
   * @param citations - Optional citations attached to this chunk. Each citation's
   * `start_index`/`end_index` are offsets into the full accumulated message, not this chunk.
   */
  content: (data: string, citations?: CitationRes[]) => void;

  /**
   * Event triggered when there is a new chunk of chain-of-thought / reasoning text.
   * Streamed alongside `content` while the agent produces its response.
   * @param data - The text of the reasoning chunk.
   */
  reasoning: (data: string) => void;

  /**
   * Event triggered when the server stops streaming a response.
   * @param message - The final message object.
   * @param message.sender - The sender of the message, either "user" or "bot".
   * @param message.createdAt - The date when the message was created.
   * @param message.type - The type of the message, e.g., "text", "image", or "error".
   * @param message.value - The content of the message.
   * @param message.meta_analysis - Optional meta-analysis results.
   * @param message.completion_usage - Optional completion usage information.
   * @param message.time_to_first_token - Optional time to first token.
   * @param message.executor_task_logs - Optional executor task logs.
   * @param message.attachedVolatileKnowledges - Optional attached volatile knowledges.
   * @param message.action_results - Optional action results.
   */
  stop: (message: AgentResult) => void;

  /**
   * Event triggered when the agent starts executing an internal task, such as a skill.
   * Only emitted on streamed executions.
   * @param data - The task payload. `task_key` identifies the task.
   */
  task_start: (data: TaskStartEvent) => void;

  /**
   * Event triggered when the agent finishes executing an internal task, such as a skill.
   * Only emitted on streamed executions.
   * @param data - The task payload. `task_key` identifies the task.
   */
  task_stop: (data: TaskStopEvent) => void;
};

export type ExecuteBodyParams = Array<{
  Key: string;
  Value: any;
}>;

export type MessageReq = {
  attachments?: UploadedVolatileKnowledge[]
}

export type UploadedVolatileKnowledge = {
  id: string;
  expirationDate: string;
  status: string;
  fileName: string;
  fileSize: number;
};

export type AttachedVolatileKnowledge = UploadedVolatileKnowledge & {
  fileId: string;
  downloadUrl: string;
};

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

export type SpeechGenerationResult = {
  content: string;
  finish_reason?: string;
  usage?: {[key: string]: any};
};

type PluginExecutionResult = SpeechGenerationResult;

export type BaseErrorBody = {
  message: string;
  statusCode: number;
};

export type ValidationErrorBody = BaseErrorBody & {
  errors: { [key: string]: string | string[] };
};

export type RateLimitErrorBody = BaseErrorBody & {
  retryAfter: number; // seconds
};

export type FileError = {
  file?: File;
  error: Error;
};

export type VolatileKnowledgeUploadRes = 
  | {
      success: true;
      id: string;
      expirationDate: string;
      status: string;
      fileName: string;
      fileSize: number;
    }
  | {
      success: false;
      error: FileError;
    };

export type VolatileKnowledgeExpirationOptions = {
  noExpiration?: boolean;
  expirationDays?: number;
}

export type VolatileKnowledgeProcessingOptions = {
  callbackUrl?: string;
  processEmbeddings?: boolean;
}

export type VolatileKnowledgeUploadOptions = VolatileKnowledgeExpirationOptions & {
  processEmbeddings?: boolean;
  useVision?: boolean;
  locale?: {
    uploadFileErrorMessage?: string;
  }
}

export type VolatileKnowledgeUploadFromFileIdOptions =
  VolatileKnowledgeExpirationOptions &
  VolatileKnowledgeProcessingOptions

export type VolatileKnowledgeUploadFromUrlOptions =
  VolatileKnowledgeExpirationOptions &
  VolatileKnowledgeProcessingOptions & {
    fileName?: string;
  }

export type VolatileKnowledgeUploadFromBase64Options =
  VolatileKnowledgeExpirationOptions &
  VolatileKnowledgeProcessingOptions & {
    fileName: string;
    mimeType: string;
    contentBase64: string;
    decodedBytes?: Uint8Array;
  }

export type TranscribeAudioOptions = {
  modelId?: string;
  prompt?: string;
  userIdentifier?: string;
}

export type TranscribeAudioResult = {
  transcript: string;
  metadata?: TranscriptionMetadata;
  tokenUsage?: TranscriptionTokenUsage;
  cost?: TranscriptionCost;
}

type TranscriptionMetadata = {
  language?: string;
  duration?: number;
}

type TranscriptionTokenUsage = {
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
}

type TranscriptionCost = {
  completion: number;
  prompt: number;
  total: number;
  currency: string;
}

export type FileUploadRes = {
  id: string;
  downloadUrl: string;
}

export type FileUploadOptions = {
  fileName?: string;
  public?: boolean;
}

export type UnauthorizedErrorBody = BaseErrorBody

export type RequestEntityTooLargeErrorBody = BaseErrorBody