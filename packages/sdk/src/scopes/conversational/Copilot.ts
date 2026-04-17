import { AgentSetupOptions } from "../../types";
import { AuthProvider } from "../../auth/AuthProvider";
import { ConversationalAgent } from "./ConversationalAgent";

export class Copilot extends ConversationalAgent {
  constructor(
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
    ): Copilot {
      return new Copilot(agentCode, authProvider, baseUrl, options);
    }
}
