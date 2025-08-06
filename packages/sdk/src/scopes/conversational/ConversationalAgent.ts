import { AgentSetupOptions } from "../../types";
import { Conversation } from "./Conversation";
import { RealtimeSession } from "./RealtimeSession";

export abstract class ConversationalAgent {
  protected constructor(
    protected readonly agentCode: string,
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
    protected readonly options?: AgentSetupOptions
  ) {}

  createRealtimeSession(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentSetupOptions
  ): RealtimeSession {
    return new RealtimeSession(agentCode, apiKey, baseUrl, options);
  }

  async createConversation(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentSetupOptions
  ): Promise<Conversation> {
    return Conversation["create"](agentCode, apiKey, baseUrl, options);
  }
}
