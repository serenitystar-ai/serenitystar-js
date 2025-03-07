![Serenity JS/TS SDK](https://github.com/serenitystar-ai/serenitystar-js/blob/main/.github/resources/sdk-banner.png?raw=true)

# Serenity Star JS/TS SDK

The Serenity Star JS/TS SDK provides a comprehensive interface for interacting with Serenity's different types of agents, such as activities, assistants, proxies, and more.

## Table of Contents
- [Serenity Star JS/TS SDK](#serenity-star-jsts-sdk)
  - [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Assistants / Copilots](#assistants--copilots)
  - [Start a new conversation with an Agent](#start-a-new-conversation-with-an-agent)
  - [Sending messages within a conversation](#sending-messages-within-a-conversation)
    - [Stream message with SSE](#stream-message-with-sse)
  - [Real time conversation](#real-time-conversation)
- [Activities](#activities)
  - [Execute an activity](#execute-an-activity)
  - [Stream responses with SSE](#stream-responses-with-sse)
- [Proxies](#proxies)
  - [Execute a proxy](#execute-a-proxy)
  - [Stream responses with SSE](#stream-responses-with-sse-1)
  - [Proxy Execution Options](#proxy-execution-options)
- [Chat Completions](#chat-completions)
  - [Execute a chat completion](#execute-a-chat-completion)
  - [Stream responses with SSE](#stream-responses-with-sse-2)
- [Plans](#plans)
  - [Execute a plan](#execute-a-plan)
  - [Stream responses with SSE](#stream-responses-with-sse-3)

# Installation

```bash
npm install @serenity-star/sdk
```

# Usage

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
  apiVersion: 2 // Optional. 2 by default
});

// Execute an activity agent
const response = await client.agents.activities.execute("marketing-campaign")
console.log(response.content)
```

# Assistants / Copilots

## Start a new conversation with an Agent

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");
```

## Sending messages within a conversation

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant")

const response = await conversation.sendMessage("I would like to get a recipe for parmesan chicken")

// Access Response data
console.log(
  response.content, // "Sure! Here is a recipe for parmesan chicken..."
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
)
```

### Stream message with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation
const conversation = await client.agents.assistants.createConversation("chef-assistant")
	
conversation
	.on("content", (chunk) => {
	  console.log(chunk) // Response chunk
	})
	.on("error", (error) => {
	  // Handle stream errors here
	})

// Streaming response with Server Sent Events (SSE)
const response = await conversation.streamMessage("I would like to get a recipe for parmesan chicken")

// Access Response Data
console.log(
  response.content, // "Sure! Here is a recipe for parmesan chicken..."
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
)
```

## Real time conversation

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation
const session = await client.agents.assistants.createRealtimeSession("chef-assistant")
	.on("session.created", () => {
		// Update UI to provide feedback if you need
	})
	.on("speech.started", () => {
	  // Update UI to let user know that is being recorded
	})
	.on("speech.stopped", () => {
	  // update UI to let user know a response is being processed
	})
	.on("response.done", () => {
	  // Update UI if you want to show the assistant is talking 
	})
	.on("error", (message?: string) => {
	  // Show error message in the UI?
	})
	.on("session.stopped", (reason: string, details?: any) => {
	  // Update UI to let the user start a new session, or show the transcript of the entire session
	})
	
await session.start()

// You can mute / unmute your mic during conversation
session.muteMicrophone()
session.unmuteMicrophone()

// Stop the session
session.stop();
```

---

# Activities

## Execute an activity

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute activity (basic example)
const response = await client.agents.activities.execute("translator-activity");

// Execute activity (advanced example)
const response = await client.agents.activities.execute("translator-activity", {
	inputParameters: {
		targetLanguage: "russian",
		textToTranslate: "hello world"
	}
});

console.log(
	response.content, // Привет, мир!
	response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
)
```

## Stream responses with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute activity and stream response with Server Sent Events (SSE)
const activity = client.agents.activities.create("translator-activity", {
  inputParameters: {
    targetLanguage: "russian",
    textToTranslate: "hello world"
  }
})
.on("content", (data) => {
  console.log(data.text); // Response chunk
})
.on("error", (error) => {
  // Handle stream errors here
});

const response = await activity.stream()

// Access final response data
console.log(
  response.content, // Привет, мир!
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);
```

---


# Proxies

## Execute a proxy

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute proxy (basic example)
const response = await client.agents.proxies.execute("proxy-agent", {
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    { role: "user", content: "What is artificial intelligence?" },
  ],
});

console.log(
  response.content,
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);

```

## Stream responses with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute proxy and stream response with Server Sent Events (SSE)
const proxy = client.agents.proxies.create("proxy-agent", {
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    { role: "user", content: "What is artificial intelligence?" },
  ],
  temperature: 1,
  max_tokens: 250,
})
.on("content", (chunk) => {
  console.log(chunk); // Response chunk
})
.on("error", (error) => {
  console.error("Error:", error);
});

const response = await proxy.stream();

// Access final response data
console.log(
  response.content,
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);

```

## Proxy Execution Options

The following options can be passed as the second parameter in `execute` or `create`:

```json
{
  // Specify the model to use
  "model": "gpt-4-turbo",
  
  // Define conversation messages
  "messages": [
    {
      "role": "system",
      "content": "You are a knowledgeable AI assistant."
    },
    {
      "role": "user",
      "content": "Can you explain the theory of relativity in simple terms?"
    }
  ],

  // Model parameters
  "temperature": 0.7,        // Controls randomness (0-1)
  "max_tokens": 500,         // Maximum length of response
  "top_p": 0.9,             // Nucleus sampling parameter
  "top_k": 50,              // Top-k sampling parameter
  "frequency_penalty": 0.5,  // Reduces repetition (-2 to 2)
  "presence_penalty": 0.2,   // Encourages new topics (-2 to 2)

  // Additional options
  "vendor": "openai",           // AI provider
  "userIdentifier": "user_123", // Unique user ID
  "groupIdentifier": "org_456", // Organization ID
  "useVision": false           // Enable/disable vision features
}
```

---


# Chat Completions

## Execute a chat completion

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute chat completion (basic example)
const response = await client.agents.chatCompletions.execute("AgentCreator", {
  message: "Hello!!!"
});

console.log(
  response.content, // AI-generated response
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);

// Execute chat completion (advanced example)
const response = await client.agents.chatCompletions.execute("Health-Coach", {
  userIdentifier: "user-123",
  agentVersion: 2,
  channel: "web",
  volatileKnowledgeIds: ["knowledge-1", "knowledge-2"],
  message: "Hi! How can I eat healthier?",
  messages: [
    { role: "assistant", content: "Hi there! How can I assist you?" }
  ]
});

console.log(
  response.content, // AI-generated response
  response.completion_usage // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);

```

## Stream responses with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute chat completion and stream response with Server Sent Events (SSE)
const chatCompletion = client.agents.chatCompletions
  .create("Health-Coach", {
    message: "Hi! How can I eat healthier?",
    messages: [
      { role: "assistant", content: "Hi there! How can I assist you?" }
    ]
  })
  .on("start", () => {
    console.log("Chat stream started");
  })
  .on("content", (chunk) => {
    console.log("Response chunk:", chunk);
  })
  .on("error", (error) => {
    console.error("Error:", error);
  });

const response = await chatCompletion.stream();

// Access final response data
console.log(
  response.content, // AI-generated response
  response.completion_usage // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);
```

---

# Plans

## Execute a plan

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute plan (basic example)
const response = await client.agents.plans.execute("event-planner");

// Execute plan (advanced example)
const response = await client.agents.plans.execute("event-planner", {
  userIdentifier: "user-123",
  agentVersion: 2,
  channel: "web",
  volatileKnowledgeIds: ["knowledge-1", "knowledge-2"]
});

console.log(
  response.content,
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);

```

## Stream responses with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Execute plan and stream response with Server Sent Events (SSE)
const plan = client.agents.plans.create("event-planner", {
  userIdentifier: "user-123",
  agentVersion: 2,
  channel: "web",
  volatileKnowledgeIds: ["knowledge-1", "knowledge-2"]
})
.on("start", () => {
  console.log("Plan execution started");
})
.on("content", (chunk) => {
  console.log("Response chunk:", chunk);
})
.on("error", (error) => {
  console.error("Error:", error);
});

const response = await plan.stream();

// Access final response data
console.log(
  response.content,
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);

```