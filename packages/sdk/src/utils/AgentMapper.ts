import { AgentResult } from "../types";

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
    };

    return result;
  };
}
