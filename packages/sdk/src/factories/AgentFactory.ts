import { Assistant } from "../scopes/conversational/Assistant";
import { Conversation } from "../scopes/conversational/Conversation";
import { ConversationInfoResult, ConversationRes } from "../scopes/conversational/Conversation/types";
import { Copilot } from "../scopes/conversational/Copilot";
import { RealtimeSession } from "../scopes/conversational/RealtimeSession";
import { Activity } from "../scopes/system/Activity";
import { ChatCompletion } from "../scopes/system/ChatCompletion";
import { Proxy } from "../scopes/system/Proxy";
import { AuthProvider } from "../auth/AuthProvider";
import {
  AgentSetupOptions,
  AgentResult,
  AgentType,
  ConversationalAgentExecutionOptionsMap,
  SystemAgentExecutionOptionsMap,
} from "../types";

export class AgentFactory {
  static createAgent<T extends AgentType>(
    type: T,
    authProvider: AuthProvider,
    baseUrl: string
  ): AgentTypeMap[T] {
    switch (type) {
      case "assistant": {
        return {
          createConversation: async (
            agentCode: string,
            options?: AgentSetupOptions
          ) => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl,
              options
            );
            const conversation = await assistant.createConversation(
              agentCode,
              authProvider,
              baseUrl,
              options
            );

            return conversation;
          },
          getConversationById: async (agentCode: string, conversationId: string, options: {
            showExecutorTaskLogs: boolean;
          } = { showExecutorTaskLogs: false }): Promise<ConversationRes> => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl
            );
            const conversation = assistant.createConversationWithoutInfo(agentCode, authProvider, baseUrl);
            return await conversation.getConversationById(conversationId, options);
          },
          getInfoByCode: async (agentCode: string, options?: AgentSetupOptions) => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl,
              options);
            const conversation = await assistant.createConversation(
              agentCode,
              authProvider,
              baseUrl,
              options
            );
            return conversation.info;
          },
          createRealtimeSession: (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["assistant"]
          ) => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl,
              options
            );
            return assistant.createRealtimeSession(
              agentCode,
              authProvider,
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
            options?: AgentSetupOptions
          ): Promise<Conversation> => {
            const copilot = Copilot.create(agentCode, authProvider, baseUrl, options);
            const conversation = await copilot.createConversation(
              agentCode,
              authProvider,
              baseUrl,
              options
            );
            return conversation;
          },
          getConversationById: async (agentCode: string, conversationId: string, options: {
            showExecutorTaskLogs: boolean;
          } = { showExecutorTaskLogs: false }): Promise<ConversationRes> => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl
            );
            const conversation = assistant.createConversationWithoutInfo(agentCode, authProvider, baseUrl);
            return await conversation.getConversationById(conversationId, options);
          },
          getInfoByCode: async (agentCode: string, options?: AgentSetupOptions) => {
            const assistant = Assistant.create(
              agentCode,
              authProvider,
              baseUrl,
              options);
            const conversation = await assistant.createConversation(
              agentCode,
              authProvider,
              baseUrl,
              options
            );
            return conversation.info;
          },
          createRealtimeSession: (
            agentCode: string,
            options?: ConversationalAgentExecutionOptionsMap["copilot"]
          ) => {
            const copilot = Copilot.create(agentCode, authProvider, baseUrl, options);
            return copilot.createRealtimeSession(
              agentCode,
              authProvider,
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
              authProvider,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["activity"]
          ): Activity => {
            return Activity["create"](agentCode, authProvider, baseUrl, options);
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
              authProvider,
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
              authProvider,
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
              authProvider,
              baseUrl,
              options
            );
          },
          create: (
            agentCode: string,
            options?: SystemAgentExecutionOptionsMap["proxy"]
          ): Proxy => {
            return Proxy["create"](agentCode, authProvider, baseUrl, options);
          },
        } as AgentTypeMap[T];
      }
      default:
        throw new Error(`Agent type ${type} not supported`);
    }
  }

  static createScopedAgent<T extends AgentType>(
    type: T,
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string
  ): ScopedAgentTypeMap[T] {
    switch (type) {
      case "assistant": {
        return {
          createConversation: async (options?: AgentSetupOptions) => {
            const assistant = Assistant.create(agentCode, authProvider, baseUrl, options);
            return await assistant.createConversation(agentCode, authProvider, baseUrl, options);
          },
          getConversationById: async (
            conversationId: string,
            options: { showExecutorTaskLogs: boolean } = { showExecutorTaskLogs: false }
          ): Promise<ConversationRes> => {
            const assistant = Assistant.create(agentCode, authProvider, baseUrl);
            const conversation = assistant.createConversationWithoutInfo(agentCode, authProvider, baseUrl);
            return await conversation.getConversationById(conversationId, options);
          },
          getInfo: async (options?: AgentSetupOptions) => {
            const assistant = Assistant.create(agentCode, authProvider, baseUrl, options);
            const conversation = await assistant.createConversation(agentCode, authProvider, baseUrl, options);
            return conversation.info;
          },
        } as ScopedAgentTypeMap[T];
      }
      case "copilot": {
        return {
          createConversation: async (options?: AgentSetupOptions) => {
            const copilot = Copilot.create(agentCode, authProvider, baseUrl, options);
            return await copilot.createConversation(agentCode, authProvider, baseUrl, options);
          },
          getConversationById: async (
            conversationId: string,
            options: { showExecutorTaskLogs: boolean } = { showExecutorTaskLogs: false }
          ): Promise<ConversationRes> => {
            const assistant = Assistant.create(agentCode, authProvider, baseUrl);
            const conversation = assistant.createConversationWithoutInfo(agentCode, authProvider, baseUrl);
            return await conversation.getConversationById(conversationId, options);
          },
          getInfo: async (options?: AgentSetupOptions) => {
            const assistant = Assistant.create(agentCode, authProvider, baseUrl, options);
            const conversation = await assistant.createConversation(agentCode, authProvider, baseUrl, options);
            return conversation.info;
          },
        } as ScopedAgentTypeMap[T];
      }
      case "activity": {
        return {
          execute: (options?: SystemAgentExecutionOptionsMap["activity"]): Promise<AgentResult> => {
            return Activity["createAndExecute"](agentCode, authProvider, baseUrl, options);
          },
          create: (options?: SystemAgentExecutionOptionsMap["activity"]): Activity => {
            return Activity["create"](agentCode, authProvider, baseUrl, options);
          },
        } as ScopedAgentTypeMap[T];
      }
      case "chat-completion": {
        return {
          execute: (options?: SystemAgentExecutionOptionsMap["chat-completion"]): Promise<AgentResult> => {
            return ChatCompletion["createAndExecute"](agentCode, authProvider, baseUrl, options);
          },
          create: (options?: SystemAgentExecutionOptionsMap["chat-completion"]): ChatCompletion => {
            return ChatCompletion["create"](agentCode, authProvider, baseUrl, options);
          },
        } as ScopedAgentTypeMap[T];
      }
      case "proxy": {
        return {
          execute: (options?: SystemAgentExecutionOptionsMap["proxy"]): Promise<AgentResult> => {
            return Proxy["createAndExecute"](agentCode, authProvider, baseUrl, options);
          },
          create: (options?: SystemAgentExecutionOptionsMap["proxy"]): Proxy => {
            return Proxy["create"](agentCode, authProvider, baseUrl, options);
          },
        } as ScopedAgentTypeMap[T];
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
    options?: AgentSetupOptions
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

  getInfoByCode: (agentCode: string, options?: AgentSetupOptions) => Promise<ConversationInfoResult> | null;
  getConversationById: (agentCode: string, conversationId: string, options?: {
    showExecutorTaskLogs: boolean;
  }) => Promise<ConversationRes>;
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
};

// ─── Agent Client Credentials scopes (agentCode omitted) ───

export type ScopedConversationalAgentScope<
  T extends keyof ConversationalAgentExecutionOptionsMap,
> = {
  createConversation: (
    options?: AgentSetupOptions
  ) => Promise<Conversation>;

  getInfo: (
    options?: AgentSetupOptions
  ) => Promise<ConversationInfoResult | null>;

  getConversationById: (
    conversationId: string,
    options?: { showExecutorTaskLogs: boolean }
  ) => Promise<ConversationRes>;
};

export type ScopedSystemAgentScope<
  T extends keyof SystemAgentExecutionOptionsMap,
  TCreateReturn,
> = {
  execute: (
    options?: SystemAgentExecutionOptionsMap[T]
  ) => Promise<AgentResult>;

  create: (
    options?: SystemAgentExecutionOptionsMap[T]
  ) => TCreateReturn;
};

type ScopedAgentTypeMap = {
  assistant: ScopedConversationalAgentScope<"assistant">;
  copilot: ScopedConversationalAgentScope<"copilot">;
  activity: ScopedSystemAgentScope<"activity", Activity>;
  "chat-completion": ScopedSystemAgentScope<"chat-completion", ChatCompletion>;
  proxy: ScopedSystemAgentScope<"proxy", Proxy>;
};
