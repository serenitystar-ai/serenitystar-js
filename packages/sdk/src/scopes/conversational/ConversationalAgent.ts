import { AgentSetupOptions } from "../../types";
import { AuthProvider } from "../../auth/AuthProvider";
import { Conversation } from "./Conversation";
import { RealtimeSession } from "./RealtimeSession";

export abstract class ConversationalAgent {
  protected constructor(
    protected readonly agentCode: string,
    protected readonly authProvider: AuthProvider,
    protected readonly baseUrl: string,
    protected readonly options?: AgentSetupOptions
  ) {}

  createRealtimeSession(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentSetupOptions
  ): RealtimeSession {
    return new RealtimeSession(agentCode, authProvider, baseUrl, options);
  }

  async createConversation(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentSetupOptions
  ): Promise<Conversation> {
    return Conversation["create"](agentCode, authProvider, baseUrl, options);
  }

  createConversationWithoutInfo(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string
  ): Conversation {
    return Conversation["createWithoutInfo"](agentCode, authProvider, baseUrl);
  }
}
