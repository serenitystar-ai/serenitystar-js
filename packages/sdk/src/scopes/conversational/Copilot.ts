import { AgentExecutionOptions } from "../../types";
import { ConversationalAgentExecutionOptionsMap } from "../../types";
import { ConversationalAgent } from "./ConversationalAgent";

export class Copilot extends ConversationalAgent<"copilot"> {
  constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ) {
    super(agentCode, apiKey, baseUrl, options);
  }

  static create(
      agentCode: string,
      apiKey: string,
      baseUrl: string,
      options?: ConversationalAgentExecutionOptionsMap["copilot"]
    ): Copilot {
      return new Copilot(agentCode, apiKey, baseUrl, options);
    }
}
