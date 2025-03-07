import {
  AgentFactory,
  ConversationalAgentScope,
  SystemAgentScope,
} from "./factories/AgentFactory";
import { Activity } from "./scopes/system/Activity";
import { ChatCompletion } from "./scopes/system/ChatCompletion";
import { Plan } from "./scopes/system/Plan";
import { Proxy } from "./scopes/system/Proxy";
import { SerenityClientOptions } from "./types";

export default class SerenityClient {
  private apiKey: string;
  private baseUrl = "https://api.serenitystar.ai/api";

  /**
   * Interact with the different agents available in Serenity Star.
   * You can choose between assistants, copilots, activities, chat completions, proxies, and plans.
   */
  public readonly agents: {
    /**
     * Interact with Assistant agents available in Serenity Star.
     * This allows you to create conversations and real-time sessions.
     * 
     * ## Start a new conversation and send a message:
     * ```typescript
     * // Regular text conversation
     * const conversation = await client.agents.assistants.createConversation("translator-assistant");
     * const response = await conversation.sendMessage("The sun was beginning to set...");
     * console.log(response.content);
     * 
     * ```
     * 
     * ## Stream message with SSE
     * ```typescript
     * const conversation = await client.agents.assistants
     *   .createConversation("translator-assistant")
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await conversation.streamMessage("The sun was beginning to set...");
     * 
     * ```
     * 
     * ## Real-time voice conversation example:
     * ```typescript
     * const session = client.agents.assistants.createRealtimeSession("marketing-assistant")
     *   .on("session.created", () => console.log("Session started"))
     *   .on("speech.started", () => console.log("User started talking"))
     *   .on("speech.stopped", () => console.log("User stopped talking"))
     *   .on("response.done", (response) => console.log("Response:", response))
     *   .on("session.stopped", () => console.log("Session stopped"));
     * 
     * await session.start();
     * // Later: session.stop();
     * ```
     */
    assistants: ConversationalAgentScope<"assistant">;

    /**
     * Interact with Copilot agents available in Serenity Star.
     * Similar to assistants but allows you to interact with the UI through callbacks.
     * 
     * Text conversation example:
     * ```typescript
     * // Regular conversation
     * const conversation = await client.agents.copilots.createConversation("app-copilot");
     * const response = await conversation.sendMessage("How do I create a new support ticket?");
     * console.log(response.content);
     * 
     * // Streaming conversation
     * const conversation = await client.agents.copilots
     *   .createConversation("app-copilot")
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await conversation.streamMessage("How do I create a new support ticket?");
     * ```
     */
    copilots: ConversationalAgentScope<"copilot">;

    /**
     * Interact with Activity agents available in Serenity Star.
     * This allows you to execute activities.
     * It supports streaming.
     * Execute simple tasks based on the user input.
     * 
     * ## Regular activity execution:
     * ```typescript
     * const response = await client.agents.activities.execute("marketing-campaign")
     * console.log(response.content);
     * 
     * // With parameters
     * const response = await client.agents.activities.execute("cooking-activity", {
     *   inputParameters: {
     *     ingredientOne: "chicken",
     *     ingredientTwo: "onion",
     *     ingredientThree: "cream",
     *   }
     * });
     * ```
     * 
     * ## Stream activity with SSE:
     * ```typescript
     * const activity = client.agents.activities
     *   .create("marketing-campaign")
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await activity.stream();
     * ```
     */
    activities: SystemAgentScope<"activity", Activity>;

    /**
     * Interact with Chat Completion agents available in Serenity Star.
     * This allows you to execute chat completions.
     * It supports streaming.
     * Chat completions allows you to fully control the conversation and generate completions.
     * 
     * ## Regular chat completion:
     * ```typescript
     * const response = await client.agents.chatCompletions.execute("Health-Coach", {
     *   message: "Hello!"
     * });
     * console.log(response.content);
     * ```
     * 
     * ## Stream chat completion with SSE:
     * ```typescript
     * const chatCompletion = client.agents.chatCompletions
     *   .create("Health-Coach", {
     *     message: "Hello!"
     *   })
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await chatCompletion.stream();
     * ```
     */
    chatCompletions: SystemAgentScope<"chat-completion", ChatCompletion>;

    /**
     * Interact with Proxy agents available in Serenity Star.
     * This allows you to execute proxies.
     * It supports streaming.
     * Proxy agents allows you to define a set of parameters dynamically for each request
     * 
     * ## Regular proxy execution:
     * ```typescript
     * const response = await client.agents.proxies.execute("proxy-agent", {
     *   model: "gpt-4o-mini-2024-07-18",
     *   messages: [
     *     {
     *       role: "system",
     *       content: "You are a helpful assistant. Always use short and concise responses"
     *     },
     *     { role: "user", content: "What is artificial intelligence?" }
     *   ],
     *   temperature: 1,
     *   max_tokens: 250
     * });
     * console.log(response.content);
     * ```
     * 
     * ## Stream proxy with SSE:
     * ```typescript
     * const proxy = client.agents.proxies
     *   .create("proxy-agent", {
     *     model: "gpt-4o-mini-2024-07-18",
     *     messages: [
     *     {
     *       role: "system",
     *       content: "You are a helpful assistant. Always use short and concise responses"
     *     },
     *       { role: "user", content: "What is artificial intelligence?" }
     *     ],
     *     temperature: 1,
     *     max_tokens: 250
     *   })
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await proxy.stream();
     * ```
     */
    proxies: SystemAgentScope<"proxy", Proxy>;

    /**
     * Interact with Plan agents available in Serenity Star.
     * This allows you to execute plans.
     * It supports streaming.
     * Plan agents are capable of building an execution plan based on the user input and execute it.
     * 
     * ## Regular plan execution:
     * ```typescript
     * const response = await client.agents.plans.execute("event-planner");
     * console.log(response.content);
     * ```
     * 
     * ## Stream plan with SSE:
     * ```typescript
     * const plan = client.agents.plans
     *   .create("event-planner")
     *   .on("start", () => console.log("Started"))
     *   .on("content", (chunk) => console.log(chunk))
     *   .on("error", (error) => console.error(error));
     * 
     * await plan.stream();
     * ```
     */
    plans: SystemAgentScope<"plan", Plan>;
  };

  constructor(options: SerenityClientOptions) {
    if (!options.apiKey) {
      throw new Error("The API key is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || this.baseUrl;

    this.agents = {
      assistants: AgentFactory.createAgent(
        "assistant",
        this.apiKey,
        this.baseUrl
      ),
      copilots: AgentFactory.createAgent("copilot", this.apiKey, this.baseUrl),
      activities: AgentFactory.createAgent(
        "activity",
        this.apiKey,
        this.baseUrl
      ),
      chatCompletions: AgentFactory.createAgent(
        "chat-completion",
        this.apiKey,
        this.baseUrl
      ),
      proxies: AgentFactory.createAgent("proxy", this.apiKey, this.baseUrl),
      plans: AgentFactory.createAgent("plan", this.apiKey, this.baseUrl),
    };
  }
}
