import { AgentSetupOptions } from "../../types";
import { ConversationalAgent } from "./ConversationalAgent";

export class Copilot extends ConversationalAgent {
  constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentSetupOptions
  ) {
    super(agentCode, apiKey, baseUrl, options);
  }

  static create(
      agentCode: string,
      apiKey: string,
      baseUrl: string,
      options?: AgentSetupOptions
    ): Copilot {
      return new Copilot(agentCode, apiKey, baseUrl, options);
    }
}
