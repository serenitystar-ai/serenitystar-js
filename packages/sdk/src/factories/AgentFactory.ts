import { Assistant } from "../scopes/conversational/Assistant";
import { Conversation } from "../scopes/conversational/Conversation";
import { Copilot } from "../scopes/conversational/Copilot";
import { RealtimeSession } from "../scopes/conversational/RealtimeSession";
import { Activity } from "../scopes/system/Activity";
import { ChatCompletion } from "../scopes/system/ChatCompletion";
import { Plan } from "../scopes/system/Plan";
import { Proxy } from "../scopes/system/Proxy";
import {
  AgentResult,
  AgentType,
  ConversationalAgentExecutionOptionsMap,
  SystemAgentExecutionOptionsMap,
} from "../types";

export class AgentFactory {
  static createAgent<T extends AgentType>(
    type: T,
    apiKey: string,
    baseUrl: string
  ): AgentTypeMap[T] {
    switch (type) {
      case "assistant": {
        return {
          createConversation: async (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["assistant"]
          ) => {
            const assistant = Assistant.create(
              agentCode,
              apiKey,
              baseUrl,
              options
            );
            const conversation = await assistant.createConversation(
              agentCode,
              apiKey,
              baseUrl,
              options
            );

            return conversation;
          },
          createRealtimeSession: (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["assistant"]
          ) => {
            const assistant = Assistant.create(
              agentCode,
              apiKey,
              baseUrl,
              options
            );
            return assistant.createRealtimeSession(
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
        } as AgentTypeMap[T];
      }
      case "copilot":
        return {
          createConversation: async (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["copilot"]
          ): Promise<Conversation> => {
            const copilot = Copilot.create(agentCode, apiKey, baseUrl, options);
            const conversation = await copilot.createConversation(
              agentCode,
              apiKey,
              baseUrl,
              options
            );
            return conversation;
          },
          createRealtimeSession: (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["copilot"]
          ) => {
            const copilot = Copilot.create(agentCode, apiKey, baseUrl, options);
            return copilot.createRealtimeSession(
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
        } as AgentTypeMap[T];

      case "activity": {
        return {
          execute: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["activity"]
          ): Promise<AgentResult> => {
            return Activity["createAndExecute"](
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["activity"]
          ): Activity => {
            return Activity["create"](agentCode, apiKey, baseUrl, options);
          },
        } as AgentTypeMap[T];
      }
      case "chat-completion": {
        return {
          execute: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["chat-completion"]
          ): Promise<AgentResult> => {
            return ChatCompletion["createAndExecute"](
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["chat-completion"]
          ): ChatCompletion => {
            return ChatCompletion["create"](
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
        } as AgentTypeMap[T];
      }
      case "proxy": {
        return {
          execute: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["proxy"]
          ): Promise<AgentResult> => {
            return Proxy["createAndExecute"](
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["proxy"]
          ): Proxy => {
            return Proxy["create"](agentCode, apiKey, baseUrl, options);
          },
        } as AgentTypeMap[T];
      }
      case "plan": {
        return {
          execute: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["plan"]
          ): Promise<AgentResult> => {
            return Plan["createAndExecute"](
              agentCode,
              apiKey,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["plan"]
          ): Plan => {
            return Plan["create"](agentCode, apiKey, baseUrl, options);
          }
        } as AgentTypeMap[T];
      }
      default:
        throw new Error(`Agent type ${type} not supported`);
    }
  }
}

export type ConversationalAgentScope<
  T extends keyof ConversationalAgentExecutionOptionsMap,
> = {
  /**
   * Create a new conversation with an agent.
   * This allows you to send messages and receive responses.
   * 
   * ## Regular conversation example:
   * ```typescript
   * const conversation = await client.agents.assistants.createConversation("agent-code");
   * const response = await conversation.sendMessage("Hello!");
   * console.log(response.content);
   * ```
   * 
   * ## Streaming conversation example:
   * ```typescript
   * const conversation = await client.agents.assistants
   *   .createConversation("agent-code")
   *   .on("start", () => console.log("Started"))
   *   .on("content", (chunk) => console.log(chunk))
   *   .on("error", (error) => console.error(error));
   * 
   * await conversation.streamMessage("Hello!");
   * ```
   * 
   * @param agentCode - The unique identifier of the agent
   * @param options - Additional options for the conversation
   * @returns A Promise that resolves to a Conversation instance
   */
  createConversation: (
    agentCode: string,
    options?: ConversationalAgentExecutionOptionsMap[T]
  ) => Promise<Conversation>;

  /**
   * Create a real-time session with an agent.
   * This allows for voice interactions and real-time responses.
   * 
   * ## Real-time session example:
   * ```typescript
   * const session = client.agents.assistants
   *   .createRealtimeSession("agent-code")
   *   .on("session.created", () => console.log("Session started"))
   *   .on("speech.started", () => console.log("User started talking"))
   *   .on("speech.stopped", () => console.log("User stopped talking"))
   *   .on("response.done", (response) => console.log("Response:", response))
   *   .on("session.stopped", () => console.log("Session stopped"));
   * 
   * await session.start();
   * // Later: session.stop();
   * ```
   * 
   * @param agentCode - The unique identifier of the agent
   * @param options - Additional options for the real-time session
   * @returns A RealtimeSession instance
   */
  createRealtimeSession: (
    agentCode: string,
    options?: ConversationalAgentExecutionOptionsMap[T]
  ) => RealtimeSession;
};

export type SystemAgentScope<
  T extends keyof SystemAgentExecutionOptionsMap,
  TCreateReturn,
> = {
  /**
   * Execute an agent synchronously and get the result.
   * 
   * ## Example:
   * ```typescript
   * const response = await client.agents.activities.execute("agent-code", {
   *   // Optional parameters specific to the agent type
   *   inputParameters: {
   *     param1: "value1",
   *     param2: "value2"
   *   }
   * });
   * console.log(response.content);
   * ```
   * 
   * @param agentCode - The unique identifier of the agent
   * @param options - Additional options for the execution
   * @returns A Promise that resolves to an AgentResult
   */
  execute: (
    agentCode: string,
    options?: SystemAgentExecutionOptionsMap[T]
  ) => Promise<AgentResult>;

  /**
   * Create an agent instance for streaming execution.
   * 
   * ## Streaming example:
   * ```typescript
   * const agent = client.agents.activities
   *   .create("agent-code", {
   *     // Optional parameters specific to the agent
   *     inputParameters: {
   *       param1: "value1",
   *       param2: "value2"
   *     }
   *   })
   *   .on("start", () => console.log("Started"))
   *   .on("content", (chunk) => console.log(chunk))
   *   .on("error", (error) => console.error(error));
   * 
   * await agent.stream();
   * ```
   * 
   * @param agentCode - The unique identifier of the agent
   * @param options - Additional options for the agent creation
   * @returns An agent instance ready for streaming
   */
  create: (
    agentCode: string,
    options?: SystemAgentExecutionOptionsMap[T]
  ) => TCreateReturn;
};

type AgentTypeMap = {
  assistant: ConversationalAgentScope<"assistant">;
  copilot: ConversationalAgentScope<"copilot">;
  activity: SystemAgentScope<"activity", Activity>;
  "chat-completion": SystemAgentScope<"chat-completion", ChatCompletion>;
  proxy: SystemAgentScope<"proxy", Proxy>;
  plan: SystemAgentScope<"plan", Plan>;
};
