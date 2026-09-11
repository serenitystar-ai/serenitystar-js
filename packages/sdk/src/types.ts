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
      /**
       * Whether the cited file can be downloaded by authorized users of the agent. Pass
       * `knowledge_file_version_id` to `conversation.downloadKnowledgeFile` to fetch it.
       * Only present on live citations; historical ones (`getConversationById`) omit it.
       */
      is_downloadable?: boolean;
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
 * One model attempt of a failed agent run, as it arrives on a **streamed** execution.
 *
 * Streaming keeps the wire's snake_case naming (`model_type`, `status_code`) and omits null
 * fields, so every field is optional. {@link AgentRunAttempt} is the buffered equivalent.
 */
export type StreamAgentRunAttempt = {
  index?: number;
  /** snake_case on the wire; `model_type`, not `modelType`. */
  model_type?: "main" | "fallback";
  /** Raw upstream status (429, 503, 529…). Informational. */
  status_code?: number;
  code?: SerenityErrorCode;
  message?: string;
  errors?: ErrorDetails;
};

/**
 * Payload of the SSE `error` event, and the value a streamed execution rejects with.
 *
 * @remarks
 * A streamed run that fails stays HTTP 200 — the failure arrives as an in-band `error`
 * frame — so there is no `statusCode` to report. Branch on `code`, exactly as you would on
 * a buffered {@link BaseErrorBody}. Every field is optional because streaming payloads omit
 * null fields.
 *
 * `agent_result`, `pending_actions` and `generated_json` are whatever the agent had produced
 * before it failed. `agent_result` is **diagnostic payload**, not UI content: it carries
 * server-authored strings and raw tool output. Do not render it verbatim.
 */
export type StreamErrorEvent = {
  message?: string;
  code?: SerenityErrorCode;
  documentationUrl?: string;
  errors?: ErrorDetails;
  attempts?: StreamAgentRunAttempt[];
  /** Partial result produced before the failure. Diagnostic — do not render verbatim. */
  agent_result?: AgentResult;
  /** Normalized to snake_case by the SDK, like the non-error path. */
  pending_actions?: PendingAction[];
  generated_json?: string;
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
   *
   * The frame is normalized by the SDK before it is emitted, so it carries the same
   * `code` / `message` / `errors` fields a buffered execution rejects with, and the
   * promise returned by `streamMessage` rejects with this exact object. `statusCode` is
   * deliberately absent — the stream itself completed with HTTP 200.
   *
   * @param error - The normalized error frame. Every field is optional: streaming
   * payloads omit null fields.
   */
  error: (error?: StreamErrorEvent) => void;

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

/**
 * Stable, machine-readable discriminators returned by the API.
 * Grouped by category, with the HTTP status each is served with.
 *
 * @remarks
 * Branch on `code`, never on `message` — messages are localized, server-authored text.
 * The `(string & {})` tail keeps the union open so a code added server-side does not
 * become a compile error for consumers.
 */
export type SerenityErrorCode =
  // Authentication & authorisation
  | "unauthorized"                  // 401
  | "forbidden"                     // 403
  // Validation — client-side, do not retry unchanged
  | "input_validation_error"        // 400  request binding/shape
  | "validation_error"              // 400  business rule
  | "vendor_validation_error"       // 400  provider rejected the request (e.g. context length)
  | "agent_run_failed"              // 400, or 502 when every attempt failed upstream
  | "request_too_large"             // 413
  | "method_not_allowed"            // 405
  | "unsupported_media_type"        // 415
  // Not found
  | "resource_not_found"            // 404  every 404 shares this code
  // Rate limiting
  | "rate_limit_exceeded"           // 429  platform
  // Upstream AI provider
  | "vendor_rate_limit_error"       // 429
  | "vendor_authentication_error"   // 502
  | "vendor_service_error"          // 503
  | "vendor_timeout_error"          // 504
  | "vendor_error"                  // 500  provider fault with no status to map
  // Unexpected
  | "server_error"                  // 500  catch-all, never exposes internal detail
  | (string & {}); // forward-compatible with codes added server-side

/**
 * The codes that represent a fault in the upstream AI provider — retry or escalate.
 *
 * ⚠️ `vendor_validation_error` is deliberately absent: it is a **400**, not an upstream
 * fault — the provider rejected the request as client-fixable. Never classify vendor
 * faults with a `"vendor_"` prefix check, or a request that will always fail gets
 * reported as retryable.
 */
export const VENDOR_FAULT_CODES = [
  "vendor_rate_limit_error",
  "vendor_authentication_error",
  "vendor_service_error",
  "vendor_timeout_error",
  "vendor_error",
] as const;

export type VendorFaultCode = (typeof VENDOR_FAULT_CODES)[number];

/** Keys that appear in `errors` on a 404 `resource_not_found` (exactly one entry, when present). */
export type NotFoundErrorKey =
  | "agent_code_invalid"
  | "agent_version_not_found"
  | "conversation_not_found"
  | "aimodel_not_found";

/**
 * Keys that appear in `errors` on a 400 `validation_error`, for the execution and conversation
 * endpoints. Open-ended: agent-designer endpoints add namespaced, feature-specific keys.
 *
 * ⚠️ `agent_code_invalid` appears BOTH here (400, agent state) and in {@link NotFoundErrorKey}
 * (404) — the key alone does not tell you the status. Read `code` / the status first.
 */
export type ValidationErrorKey =
  // Request input
  | "message_required" | "invalid_request_body" | "input_keys_duplicated" | "multiple_inputs"
  | "required_parameters_missing" | "required_parameters_null" | "required_parameters_empty"
  | "parameter_type_mismatch" | "missing_variables" | "invalid_messages"
  | "audio_input_not_supported"
  // Agent state
  | "agent_inactive" | "agent_code_invalid" | "agent_version_inactive"
  | "ai_model_not_allowed" | "invalid_model"
  // Conversation
  | "conversation_closed" | "conversation_context_not_found"
  // Response format & reasoning
  | "invalid_response_format_type" | "invalid_response_format_schema"
  | "response_format_not_supported_by_model" | "invalid_reasoning_effort"
  | "invalid_reasoning_detail" | "reasoning_effort_not_supported_by_model"
  | "reasoning_detail_not_supported_by_model"
  // Skills & tools
  | "invalid_skills_options" | "conflicting_skills_options" | "tool_approval_pending"
  | "tool_approval_skill_not_found" | "tool_approval_ambiguous_tool"
  // Quota & balance
  | "insufficient_balance" | "monthly_quota_exceeded" | "user_quota_exceeded"
  | "organization_quota_exceeded" | "model_quota_exceeded"
  | "excluded_bonified_execution_insufficient_balance"
  | (string & {});

/** A field/detail breakdown. Values are a single string, or an array on `input_validation_error`. */
export type ErrorDetails = { [key: string]: string | string[] };

export type BaseErrorBody = {
  /**
   * Localized, server-authored text. Safe to show a user, but do not branch on it and do
   * not render it as HTML without escaping — it can embed resource names and, on vendor
   * faults, upstream provider detail.
   */
  message: string;
  statusCode: number;
  /** Stable discriminator. Branch on this, not on `message`. Absent on legacy responses. */
  code?: SerenityErrorCode;
  /**
   * Server-supplied documentation link. Treat it as display text, not a navigation target,
   * unless you validate the origin.
   */
  documentationUrl?: string;
  /** Present whenever the response carried a field or detail breakdown. */
  errors?: ErrorDetails;
};

export type ValidationErrorBody = BaseErrorBody & {
  errors: ErrorDetails;
};

/**
 * 400 business-rule failure. `errors` may be absent entirely — some conditions return a
 * message only. Values are single strings here, `string[]` on `input_validation_error`,
 * where the keys are request field names instead.
 */
export type BusinessValidationErrorBody = BaseErrorBody & {
  code: "validation_error";
  errors?: Partial<Record<ValidationErrorKey, string>> & ErrorDetails;
};

export type NotFoundErrorBody = BaseErrorBody & {
  code: "resource_not_found";
  /** Absent on an "unspecified miss" — the reason is then in `message`. */
  errors?: Partial<Record<NotFoundErrorKey, string>> & ErrorDetails;
};

/**
 * An upstream provider fault (429/502/503/504/500). Deliberately EXCLUDES
 * `vendor_validation_error`, which is a 400 the caller can fix.
 *
 * `errors` is present when the fault has a per-item breakdown — e.g. per-file OCR
 * failures, keyed by file name.
 */
export type VendorErrorBody = BaseErrorBody & {
  code: VendorFaultCode;
};

/** 400 — the provider rejected the request as client-fixable (typically context length). */
export type VendorValidationErrorBody = BaseErrorBody & {
  code: "vendor_validation_error";
  /** Single `vendor_error` entry carrying the provider's own rejection detail. */
  errors?: { vendor_error?: string } & ErrorDetails;
};

/** One model attempt of a failed agent run, as returned on a buffered (non-streamed) response. */
export type AgentRunAttempt = {
  index: number;
  /** `main` or `fallback` — never a model name. */
  modelType: "main" | "fallback";
  code?: SerenityErrorCode;
  /** Raw upstream status (429, 503, 529…). Informational; omitted for non-vendor attempts. */
  statusCode?: number;
  message?: string;
  errors?: ErrorDetails;
};

export type AgentRunFailedErrorBody = BaseErrorBody & {
  code: "agent_run_failed";
  /** Full picture. Top-level `errors` mirrors only the LAST attempt. */
  attempts?: AgentRunAttempt[];
};

export type RateLimitErrorBody = BaseErrorBody & {
  code?: "rate_limit_exceeded";
  /**
   * Seconds, from the `Retry-After` header. Only set when the header was present — the SDK
   * never fabricates a value, so `undefined` means "the server did not say".
   */
  retryAfter?: number;
};

/**
 * Every shape {@link BaseErrorBody} can be narrowed to. All members extend `BaseErrorBody`,
 * so `message` and `statusCode` are always readable without narrowing.
 */
export type SerenityErrorBody =
  | BaseErrorBody
  | ValidationErrorBody
  | BusinessValidationErrorBody
  | VendorValidationErrorBody
  | NotFoundErrorBody
  | VendorErrorBody
  | AgentRunFailedErrorBody
  | RateLimitErrorBody;

export type FileError = {
  file?: File;
  /**
   * A {@link SerenityApiError} whenever the failure came from the API, so `code`,
   * `statusCode` and `errors` are readable off it. A plain `Error` for local failures
   * (missing argument, network fault).
   */
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