export enum VendorEnum {
    OpenAI,
    Azure,
    Mistral,
    HuggingFace,
    Together,
    Groq,
    Anthropic,
    Google,
    Mock,
    Serenity,
    Cerebras,
    Replicate,
    AmazonBedrock,
    GoogleVertex,
    OpenRouter,
    xAI,
    IBM,
    DeepSeek,
    Nvidia
}

export type ProxyExecutionMessage = {
    /** The role of the message sender (e.g., 'system', 'user', 'assistant') */
    role: "system" | "user" | "assistant";
    /** The actual message content */
    content: string;
    /** Array of unique ids for volatile knowledge files */
    volatileKnowledgeIds?: string[];
}

export type ProxyExecutionOptions = {
    /** The identifier of the AI model to use (e.g., 'gpt-4', 'claude-2')
     * @see https://docs.serenitystar.ai/docs/serenity-aihub/ai-models/available-models/ for available models
     */
    model: string;
    /** Array of messages representing the conversation history */
    messages: ProxyExecutionMessage[];
    /** Reduces repetition by lowering the likelihood of using tokens that have appeared recently. Range: -2.0 to 2.0 */
    frequency_penalty?: number;
    /** The maximum number of tokens to generate in the response */
    max_tokens?: number;
    /** Increases diversity by penalizing tokens that have appeared in the text at all. Range: -2.0 to 2.0 */
    presence_penalty?: number;
    /** Controls randomness in the output. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused. Range: 0-1 */
    temperature?: number;
    /** Alternative to temperature. Limits cumulative probability of tokens considered. Range: 0-1 */
    top_p?: number;
    
    // Not OpenAI standard properties
    /** Limits the number of tokens to consider at each step. Used by some models */
    top_k?: number;
    /** The AI vendor/provider to use for this request */
    vendor?: VendorEnum;
    /** Identifier for the user making the request */
    userIdentifier?: string;
    /** Identifier for the user's group or organization */
    groupIdentifier?: string;
    
    // Capabilities
    /** Whether to enable vision/image understanding capabilities */
    useVision?: boolean;
}
