import { AgentExecutionOptions } from "../../types";
import { ConversationalAgentExecutionOptionsMap } from "../../types";
import { Conversation } from "./Conversation";
import { RealtimeSession } from "./RealtimeSession";

export abstract class ConversationalAgent<
  T extends keyof ConversationalAgentExecutionOptionsMap,
> {
  protected constructor(
    protected readonly agentCode: string,
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
    protected readonly options?: ConversationalAgentExecutionOptionsMap[T]
  ) {}

  createRealtimeSession(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ): RealtimeSession {
    return new RealtimeSession(agentCode, apiKey, baseUrl, options);
  }

  async createConversation(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptions
  ): Promise<Conversation> {
    return await Conversation["create"](agentCode, apiKey, baseUrl, options);
  }
}
