import { AgentSetupOptions } from "../../types";
import { ConversationalAgent } from "./ConversationalAgent";

export class Assistant extends ConversationalAgent {
  private constructor(
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
  ): Assistant {
    return new Assistant(agentCode, apiKey, baseUrl, options);
  }
}
