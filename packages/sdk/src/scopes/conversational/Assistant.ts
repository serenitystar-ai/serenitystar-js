import { AgentSetupOptions } from "../../types";
import { AuthProvider } from "../../auth/AuthProvider";
import { ConversationalAgent } from "./ConversationalAgent";

export class Assistant extends ConversationalAgent {
  private constructor(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentSetupOptions
  ) {
    super(agentCode, authProvider, baseUrl, options);
  }
  
  static create(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentSetupOptions
  ): Assistant {
    return new Assistant(agentCode, authProvider, baseUrl, options);
  }
}
