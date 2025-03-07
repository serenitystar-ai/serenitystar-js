import { AgentResult } from "../../../types";

/**
 * Events that can be emitted by a realtime session.
 * 
 * @remarks
 * The RealtimeSessionEvents type defines all possible events that can be triggered during 
 * a realtime conversation session with Serenity. These events help track the lifecycle
 * and state of the session, from creation to completion, including speech interactions
 * and error handling.
 * 
 * @example
 * ```typescript
 * session.on('session.created', () => {
 *   console.log('Session started');
 * });
 * ```
 */
export type RealtimeSessionEvents = {
  /**
   * Triggered when a new session is initialized
   */
  "session.created": () => void;

  /**
   * Triggered when voice input begins
   */
  "speech.started": () => void;

  /**
   * Triggered when voice input ends
   */
  "speech.stopped": () => void;

  /**
   * Triggered when the agent has completed generating a response
   */
  "response.done": () => void;

  /**
   * Triggered when any error occurs during the session
   * @param message - Optional error message
   */
  error: (message?: string) => void;

  /**
   * Triggered when the session is terminated
   * @param reason - Optional termination reason
   * @param details - Optional additional details
   */
  "session.stopped": (reason?: string, details?: any) => void;
  
  /**
   * Triggered when Serenity processes a response
   * @param data - The complete response object containing:
   *   - content: The main text content of the response
   *   - instance_id: Unique identifier for the response instance
   *   - json_content?: Optional structured data in JSON format
   *   - meta_analysis?: Optional metadata analysis results
   *   - completion_usage?: Optional usage metrics for the completion
   *   - time_to_first_token?: Optional time taken to receive first token
   *   - executor_task_logs?: Optional logs from task execution
   *   - action_results?: Optional results from plugin executions
   */
  "response.processed": (data: AgentResult) => void;
};

export type EventType = "serenity.session.created" | "serenity.session.close" | "serenity.response.processed" | string & {};
export type SerenityEvent = { [key: string]: any } & { type: EventType };

export type SDPConfiguration = {
  url: string;
  headers: { [key: string]: string };
}

export type SerenitySessionCreateEvent = {
  type: "serenity.session.create";
  user_identifier?: string;
  input_parameters?: { [key: string]: any };
  channel?: string;
};

export type SerenitySessionCreatedEvent = SDPConfiguration & {
  type: "serenity.session.created";
};

export type SerenitySessionErrorEvent = {
  reason: string;
  message: string;
  errors?: { [key: string]: string };
}

export type SerenitySessionCloseEvent = SerenitySessionErrorEvent & {
  type: "serenity.session.close";
};

export type SerenityResponseProcessedEvent = {
  type: "serenity.response.processed";
  result: AgentResult
}

