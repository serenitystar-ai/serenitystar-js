import { ProxyExecutionOptions } from "./scopes/system/types";

/**
 * Options for configuring the Serenity client.
 */
export type SerenityClientOptions = {
  /**
   * The API key used for authenticating requests to the Serenity API.
   */
  apiKey: string;
  /**
   * The base URL of the Serenity API.
   */
  baseUrl?: string;
};

export type AgentType = 'assistant' | 'copilot' | 'proxy' | 'activity' | 'plan' | 'chat-completion';

/**
 * Base options for executing any type of agent.
 */
export type AgentExecutionOptions = {
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
   * Optional array of volatile knowledge IDs to include in the execution context.
   */
  volatileKnowledgeIds?: string[];
};

/**
 * Extends AgentExecutionOptions to include input parameters for agents that support them.
 */
export type AgentExecutionOptionsWithParameters = AgentExecutionOptions & {
  /**
   * Optional key-value pairs of input parameters specific to the agent.
   */
  inputParameters?: { [key: string]: any }
}

/**
 * Maps agent types to their specific execution options for conversational agents.
 * 
 * @remarks
 * Both assistant and copilot agents support input parameters in addition to base execution options.
 */
export type ConversationalAgentExecutionOptionsMap = {
  "assistant": AgentExecutionOptionsWithParameters,
  "copilot": AgentExecutionOptionsWithParameters,
}

/**
 * Maps agent types to their specific execution options for system agents.
 * 
 * @remarks
 * - Chat-completion agents require message content
 * - Proxy agents have specific proxy execution options
 */
export type SystemAgentExecutionOptionsMap = {
  "activity": AgentExecutionOptionsWithParameters,
  "plan": AgentExecutionOptionsWithParameters,
  "chat-completion": AgentExecutionOptionsWithParameters & {
      /** The single message content for the chat completion */
      message: string,
      /** Optional array of message objects representing the conversation history */
      messages?: { role: string, content: string }[]
  },
  "proxy": AgentExecutionOptions & ProxyExecutionOptions
}

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
}

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
   * @param data - The data chunk.
   */
  content: (data: string) => void;

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

// #region Plugin types
export type SpeechGenerationResult = {
  content: string;
  finish_reason?: string;
  usage?: {[key: string]: any};
};

type PluginExecutionResult = SpeechGenerationResult;
// #endregion
// #endregion
