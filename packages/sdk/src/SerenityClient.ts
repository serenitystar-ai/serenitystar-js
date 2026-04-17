import {
  AgentFactory,
  ConversationalAgentScope,
  SystemAgentScope,
  ScopedConversationalAgentScope,
  ScopedSystemAgentScope,
} from "./factories/AgentFactory";
import {
  ServiceFactory,
  AudioServiceScope,
} from "./factories/ServiceFactory";
import { Activity } from "./scopes/system/Activity";
import { ChatCompletion } from "./scopes/system/ChatCompletion";
import { Proxy } from "./scopes/system/Proxy";
import { ApiKeyClientOptions, AgentClientCredentialsOptions, SerenityClientOptions } from "./types";
import { createAuthProvider } from "./auth";

// ─── Full client shape (API Key) ───
export type FullAgents = {
  assistants: ConversationalAgentScope<"assistant">;
  copilots: ConversationalAgentScope<"copilot">;
  activities: SystemAgentScope<"activity", Activity>;
  chatCompletions: SystemAgentScope<"chat-completion", ChatCompletion>;
  proxies: SystemAgentScope<"proxy", Proxy>;
};

export type FullServices = {
  audio: AudioServiceScope;
};

// ─── Scoped client shape (Agent Client Credentials) ───
export type ScopedAgents = {
  assistants: ScopedConversationalAgentScope<"assistant">;
  copilots: ScopedConversationalAgentScope<"copilot">;
  activities: ScopedSystemAgentScope<"activity", Activity>;
  chatCompletions: ScopedSystemAgentScope<"chat-completion", ChatCompletion>;
  proxies: ScopedSystemAgentScope<"proxy", Proxy>;
};

/** Full-access client returned when using API Key authentication */
export class FullSerenityClient {
  private baseUrl = "https://api.serenitystar.ai/api";

  /**
   * Interact with the different agents available in Serenity Star.
   * You can choose between assistants, copilots, activities, chat completions and proxies.
   */
  public readonly agents: FullAgents;

  /**
   * Access various services provided by Serenity Star.
   * Services include audio transcription and other utility features.
   */
  public readonly services: FullServices;

  constructor(options: ApiKeyClientOptions) {
    this.baseUrl = options.baseUrl || this.baseUrl;
    const authProvider = createAuthProvider(options);

    this.agents = {
      assistants: AgentFactory.createAgent("assistant", authProvider, this.baseUrl),
      copilots: AgentFactory.createAgent("copilot", authProvider, this.baseUrl),
      activities: AgentFactory.createAgent("activity", authProvider, this.baseUrl),
      chatCompletions: AgentFactory.createAgent("chat-completion", authProvider, this.baseUrl),
      proxies: AgentFactory.createAgent("proxy", authProvider, this.baseUrl),
    };
    this.services = {
      audio: ServiceFactory.createService("audio", authProvider, this.baseUrl),
    };
  }
}

/** Agent-scoped client returned when using Agent Client Credentials authentication */
export class ScopedSerenityClient {
  private baseUrl = "https://api.serenitystar.ai/api";

  /**
   * Interact with the agent scoped to this client.
   * Operations do not require an agentCode parameter — it is baked in.
   */
  public readonly agents: ScopedAgents;

  constructor(options: AgentClientCredentialsOptions) {
    this.baseUrl = options.baseUrl || this.baseUrl;
    const authProvider = createAuthProvider(options);
    const agentCode = options.agentClientCredentials.agentCode;

    this.agents = {
      assistants: AgentFactory.createScopedAgent("assistant", agentCode, authProvider, this.baseUrl),
      copilots: AgentFactory.createScopedAgent("copilot", agentCode, authProvider, this.baseUrl),
      activities: AgentFactory.createScopedAgent("activity", agentCode, authProvider, this.baseUrl),
      chatCompletions: AgentFactory.createScopedAgent("chat-completion", agentCode, authProvider, this.baseUrl),
      proxies: AgentFactory.createScopedAgent("proxy", agentCode, authProvider, this.baseUrl),
    };
  }
}

/**
 * Create a Serenity client. Returns a `FullSerenityClient` when using API Key auth,
 * or a `ScopedSerenityClient` when using Agent Client Credentials.
 *
 * @example
 * // API Key — full access
 * const client = new SerenityClient({ apiKey: "sk_..." });
 * client.agents.assistants.createConversation(agentCode, options);
 * client.services.audio.transcribe(file);
 *
 * @example
 * // Agent Client Credentials — scoped access
 * const client = new SerenityClient({ agentClientCredentials: { agentCode, publicKey, tokenProvider } });
 * client.agents.assistants.createConversation(options); // no agentCode needed
 */
function _SerenityClientFactory(options: SerenityClientOptions) {
  if ("apiKey" in options && options.apiKey) {
    return new FullSerenityClient(options as ApiKeyClientOptions);
  }
  return new ScopedSerenityClient(options as AgentClientCredentialsOptions);
}

// ─── Type-level overloads for `new SerenityClient(...)` ───
export interface SerenityClientConstructor {
  new (options: ApiKeyClientOptions): FullSerenityClient;
  new (options: AgentClientCredentialsOptions): ScopedSerenityClient;
}

export const SerenityClient = _SerenityClientFactory as unknown as SerenityClientConstructor;
export default SerenityClient;
