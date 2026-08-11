import { AgentResult, PendingAction } from "../types";

export class AgentMapper {
  public static mapAgentResultToSnakeCase = (data: {
    [key: string]: any;
  }): AgentResult => {
    const result: AgentResult = {
      content: data.content,
      instance_id: data.instanceId,
      action_results: data.actionResults,
      completion_usage: data.completionUsage,
      executor_task_logs: data.executorTaskLogs,
      json_content: data.jsonContent,
      meta_analysis: data.metaAnalysis,
      time_to_first_token: data.timeToFirstToken,
      citations: data.citations,
      agent_message_id: data.agentMessageId,
      user_message_id: data.userMessageId,
      pending_actions: AgentMapper.mapPendingActions(
        data.pendingActions ?? data.pending_actions
      ),
    };

    return result;
  };

  /**
   * Normalizes pending actions to the snake_case shape used across the SDK.
   * Accepts either casing on every field, so it is safe to run over both the
   * REST response (camelCase) and the streaming payload (already snake_case).
   */
  public static mapPendingActions = (
    actions: any
  ): PendingAction[] | undefined => {
    if (!Array.isArray(actions)) return undefined;

    return actions.map((action: { [key: string]: any }) => {
      switch (action?.type) {
        case "approval":
          return {
            type: "approval",
            request_id: action.requestId ?? action.request_id,
            call_id: action.callId ?? action.call_id,
            skill_code: action.skillCode ?? action.skill_code,
            skill_type: action.skillType ?? action.skill_type,
            tool: action.tool,
            arguments: action.arguments,
          };
        case "connection":
          return {
            type: "connection",
            auth_type: action.authType ?? action.auth_type,
            url: action.url,
            connector_name: action.connectorName ?? action.connector_name,
            connector_img_url:
              action.connectorImgUrl ?? action.connector_img_url,
            connector_id: action.connectorId ?? action.connector_id,
          };
        default:
          // Unknown variant — pass through untouched so it is not swallowed.
          return action;
      }
    }) as PendingAction[];
  };
}
