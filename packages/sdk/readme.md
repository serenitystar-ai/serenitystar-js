![Serenity JS/TS SDK](https://github.com/serenitystar-ai/serenitystar-js/blob/main/.github/resources/sdk-banner.png?raw=true)

# Serenity Star JS/TS SDK

The Serenity Star JS/TS SDK provides a comprehensive interface for interacting with Serenity's different types of agents, such as activities, assistants, proxies, and more.

## Table of Contents
- [Serenity Star JS/TS SDK](#serenity-star-jsts-sdk)
  - [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Authentication Modes](#authentication-modes)
  - [API Key (Full Access)](#api-key-full-access)
  - [Agent Client Credentials (Token Provider)](#agent-client-credentials-token-provider)
  - [Feature Comparison](#feature-comparison)
- [Usage](#usage)
- [Assistants / Copilots](#assistants--copilots)
  - [Start a new conversation with an Agent](#start-a-new-conversation-with-an-agent)
  - [Get conversation information](#get-conversation-information)
  - [Use channel-pinned agent version](#use-channel-pinned-agent-version)
  - [Get conversation by id](#get-conversation-by-id)
  - [Sending messages within a conversation](#sending-messages-within-a-conversation)
    - [Stream message with SSE](#stream-message-with-sse)
  - [Real time conversation](#real-time-conversation)
  - [Message Feedback](#message-feedback)
    - [Submit feedback](#submit-feedback)
    - [Remove feedback](#remove-feedback)
  - [Connector Status](#connector-status)
  - [Tool approvals](#tool-approvals)
  - [User choices](#user-choices)
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
- [Shared Features](#shared-features)
  - [Download Attached Files](#download-attached-files)
  - [Stop Streaming Response](#stop-streaming-response)
  - [Reasoning (Chain-of-Thought)](#reasoning-chain-of-thought)
  - [Task events](#task-events)
  - [Citations](#citations)
    - [Citations on stored messages](#citations-on-stored-messages)
    - [Downloading a cited knowledge file](#downloading-a-cited-knowledge-file)
  - [Upload Files (Volatile Knowledge)](#upload-files-volatile-knowledge)
  - [Audio Input](#audio-input)
    - [Send Audio Messages (Assistants/Copilots)](#send-audio-messages-assistantscopilots)
    - [Execute with Audio (Activities/Proxies/Chat Completions)](#execute-with-audio-activitiesproxieschat-completions)
    - [Audio Transcription Service](#audio-transcription-service)
- [Error handling](#error-handling)
  - [The error envelope](#the-error-envelope)
  - [Branch on `code`, never on `message`](#branch-on-code-never-on-message)
  - [Error code reference](#error-code-reference)
  - [Validation errors](#validation-errors)
  - [Not found errors](#not-found-errors)
  - [Vendor faults vs. vendor validation](#vendor-faults-vs-vendor-validation)
  - [Rate limiting](#rate-limiting)
  - [Failed agent runs and `attempts[]`](#failed-agent-runs-and-attempts)
  - [Streaming vs. buffered errors](#streaming-vs-buffered-errors)
  - [File upload errors](#file-upload-errors)
  - [Realtime sessions](#realtime-sessions)
  - [Working with `Error` instances](#working-with-error-instances)
  - [Security notes](#security-notes)
- [Migrating from 2.x](#migrating-from-2x)
  - [Breaking changes](#breaking-changes)
  - [Status code changes](#status-code-changes)
  - [Additive changes and fixes](#additive-changes-and-fixes)

# Installation

```bash
npm install @serenity-star/sdk
```

# Authentication Modes

The SDK supports two authentication modes that determine how the client is instantiated and which features are available.

## API Key (Full Access)

Use an API key when you want full access to all agents and services. API keys can have permission restrictions configured in Serenity\* Star.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// agentCode is passed to each operation
const conversation = await client.agents.assistants.createConversation("chef-assistant");

// All services are available
const transcript = await client.services.audio.transcribe(audioFile, { modelId: '<MODEL_ID>' });
```

## Agent Client Credentials (Token Provider)

Use Agent Client Credentials when you want the client scoped to a **single agent** and to obtain short-lived access tokens through a callback you provide. This mode does not expose long-lived credentials in your client code.

> **Setup:** Agent Client Credentials are created per-agent in the **Agent Design Studio** inside Serenity\* Star. Each credential set includes a `ClientId`, `ClientSecret`, and `publicKey`.
> - **`ClientId` and `ClientSecret`** must be kept server-side only. Your backend uses them to issue a short-lived client token.
> - **`publicKey`** is safe to expose in your client-side code and is passed to the `SerenityClient` constructor.

The `agentCode` is fixed at construction time and is **not passed** to individual method calls. The SDK manages the full token lifecycle (acquisition, proactive refresh, retry on 401) transparently.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  agentClientCredentials: {
    agentCode: "chef-assistant",
    publicKey: "<PUBLIC_KEY>",         // safe to expose client-side
    tokenProvider: async ({ context }) => {
      // Call your backend, which uses ClientId + ClientSecret to issue a token
      const res = await fetch("/api/get-serenity-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: context.publicKey,
          agentCode: context.agentCode,
        }),
      });
      return (await res.json()).token;
    },
  },
});

// agentCode is NOT passed — it was fixed at construction time
const conversation = await client.agents.assistants.createConversation();
```

> **Note:** Your `tokenProvider` callback only needs to return a client token from your backend. The SDK handles the token exchange with the Serenity API automatically — calling the exchange endpoint, obtaining a short-lived access token, and refreshing it transparently.

## Feature Comparison

| Feature | API Key | Agent Client Credentials |
|---|---|---|
| `agents.assistants.createConversation(agentCode, options?)` | ✅ | ➡️ `createConversation(options?)` |
| `agents.assistants.getInfoByCode(agentCode, options?)` | ✅ | ➡️ `getInfo(options?)` |
| `agents.assistants.getConversationById(agentCode, id, options?)` | ✅ | ➡️ `getConversationById(id, options?)` |
| `agents.assistants.createRealtimeSession(agentCode, options?)` | ✅ | ❌ Not available |
| `agents.copilots.*` | ✅ Same as assistants | ➡️ Same scoping as assistants |
| `agents.activities.execute(agentCode, options?)` | ✅ | ➡️ `execute(options?)` |
| `agents.activities.create(agentCode, options?)` | ✅ | ➡️ `create(options?)` |
| `agents.chatCompletions.*` | ✅ Same as activities | ➡️ Same scoping as activities |
| `agents.proxies.*` | ✅ Same as activities | ➡️ Same scoping as activities |
| `services.audio.transcribe(...)` | ✅ | ❌ Not available (`services` is undefined) |

# Usage

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>'
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

// Create a new conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");
```

> **Token Provider Auth:** Omit `agentCode` — it was fixed at construction time.
> ```ts
> const conversation = await client.agents.assistants.createConversation();
> // or with options:
> const conversation = await client.agents.assistants.createConversation({ channel: "web" });
> ```

## Get conversation information

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Get information about an assistant agent conversation (basic example)
const agentInfo = await client.agents.assistants.getInfoByCode("chef-assistant");

console.log(
  agentInfo.conversation.initialMessage, // "Hello! I'm your personal chef assistant..."
  agentInfo.conversation.starters, // ["What's for dinner tonight?", "Help me plan a meal", ...]
  agentInfo.agent.version, // 1
  agentInfo.agent.visionEnabled, // true/false
  agentInfo.agent.isRealtime, // true/false
  agentInfo.channel, // Optional chat widget configuration
  agentInfo.agent.photoUrl // Agent's profile image URL
);

// Get information about an assistant agent conversation (advanced example with options)
const agentInfoAdvanced = await client.agents.assistants.getInfoByCode("chef-assistant", {
  agentVersion: 2, // Target specific version of the agent
  inputParameters: {
    dietaryRestrictions: "vegetarian",
    cuisinePreference: "italian",
    skillLevel: "beginner"
  },
  userIdentifier: "user-123",
  channel: "web"
});

console.log(
  agentInfoAdvanced.conversation.initialMessage, // "Hello! I'm your personalized Italian vegetarian chef assistant for beginners..."
  agentInfoAdvanced.conversation.starters, // ["Show me easy vegetarian pasta recipes", "What Italian herbs should I use?", ...]
  agentInfoAdvanced.agent.version, // 2
);
```

> **Token Provider Auth:** Use `getInfo(options?)` instead of `getInfoByCode(agentCode, options?)`.
> ```ts
> const agentInfo = await client.agents.assistants.getInfo();
> // with options:
> const agentInfo = await client.agents.assistants.getInfo({ agentVersion: 2 });
> ```

## Use channel-pinned agent version

By default, when no `agentVersion` is specified, the SDK executes the **latest** version of the agent. If your application uses channels that pin a specific agent version, you can opt in to that behavior with `useChannelVersion`:

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Opt in to using the version defined in the channel configuration
const conversation = await client.agents.assistants.createConversation("chef-assistant", {
  channel: "my-channel",
  useChannelVersion: true,
});

// The conversation now targets the agent version pinned by the channel.
// If the channel pins version 3, all messages will execute against version 3.
const response = await conversation.sendMessage("Hello!");
console.log(response.content);
```

> **Note:** An explicit `agentVersion` always takes priority over the channel's target version. When `useChannelVersion` is `false` (the default), the channel metadata is still available in `conversation.info` but does not affect which agent version is executed.

> **Token Provider Auth:** Same options, omit `agentCode`.
> ```ts
> const conversation = await client.agents.assistants.createConversation({
>   channel: "my-channel",
>   useChannelVersion: true,
> });
> ```

## Get conversation by id

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Get conversation by id (basic example)
const conversation = await client.agents.assistants.getConversationById("<agent-code>", "<conversation-id>");

console.log(
  conversation.id, // "<conversation-id>"
  conversation.messages, // Array of messages (each may include a `citations` array — see Citations)
  conversation.open // Boolean that indicates if the conversation was closed or not
);

// Get conversation by id with executor task logs
const conversationWithLogs = await client.agents.assistants.getConversationById("<agent-code>", "<conversation-id>", {
  showExecutorTaskLogs: true
});

console.log(
  conversationWithLogs.executorTaskLogs // Detailed task execution logs
);
```

> **Token Provider Auth:** Omit `agentCode`.
> ```ts
> const conversation = await client.agents.assistants.getConversationById("<conversation-id>");
> // with options:
> const conversationWithLogs = await client.agents.assistants.getConversationById("<conversation-id>", { showExecutorTaskLogs: true });
> ```

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
  response.instance_id, // instance id for the conversation
)
```

> **Errors:** A failing call rejects with a normalized error body. Branch on `error.code`, never
> on `error.message`. See [Error handling](#error-handling).

### Stream message with SSE

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation
const conversation = await client.agents.assistants.createConversation("chef-assistant")
	
conversation
	.on("content", (chunk, citations) => {
	  console.log(chunk) // Response chunk
	  // `citations` is an optional array attached to some chunks.
	  // Each citation's start_index / end_index are offsets into the FULL accumulated
	  // message, not into this individual chunk.
	  if (citations) {
	    console.log(citations) // CitationRes[]
	  }
	})
	.on("error", (error) => {
	  // In-band failure: `error.code` is set, `statusCode` is not.
	  // See "Streaming vs. buffered errors" under Error handling.
	})

// Streaming response with Server Sent Events (SSE)
const response = await conversation.streamMessage("I would like to get a recipe for parmesan chicken")

// Access Response Data
console.log(
  response.content, // "Sure! Here is a recipe for parmesan chicken..."
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }],
  response.citations, // CitationRes[] — full citation list for the final message
  response.instance_id, // instance id for the conversation
)
```

> **Citations:** When the agent grounds its answer in knowledge sources, citations are delivered both incrementally on `content` events (second argument) and as a consolidated `response.citations` array on the final result. See [Citations](#citations) for the full shape.

> **Stream errors:** A streamed run that fails still completes with HTTP 200 — the failure arrives as an in-band `error` event **and** rejects the promise with the same object, which carries no `statusCode`. See [Streaming vs. buffered errors](#streaming-vs-buffered-errors).

## Real time conversation

```tsx
import SerenityClient from '@serenity-star/sdk';
import type { RealtimeErrorDetails } from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create a real-time session
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
	.on("error", (message?: string, details?: RealtimeErrorDetails) => {
	  // `details.source` separates a client-side problem from an upstream vendor fault
	})
	.on("session.stopped", (reason?: string, details?: any) => {
	  // Update UI to let the user start a new session, or show the transcript of the entire session
	})
	
await session.start()

// You can mute / unmute your mic during conversation
session.muteMicrophone()
session.unmuteMicrophone()

// Stop the session
session.stop();
```

> **Token Provider Auth:** `createRealtimeSession` is not available with this auth mode. Realtime features require API Key authentication.

> **Errors:** A realtime session reports failures on the WebSocket close frame, not over HTTP. The
> `error` event's second argument carries the source, the close `reason` and the server's `errors`
> dictionary. See [Realtime sessions](#realtime-sessions).

## Message Feedback

You can collect user feedback on agent responses to help improve the quality of your assistant.

### Submit feedback

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");

// Send a message
const response = await conversation.sendMessage("I would like to get a recipe for parmesan chicken");

// Submit positive feedback (thumbs up)
await conversation.submitFeedback({
  agentMessageId: response.agent_message_id!,
  feedback: true
});

// Or submit negative feedback (thumbs down)
await conversation.submitFeedback({
  agentMessageId: response.agent_message_id!,
  feedback: false
});
```

### Remove feedback

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");

// Send a message
const response = await conversation.sendMessage("I would like to get a recipe for parmesan chicken");

// Submit feedback first
await conversation.submitFeedback({
  agentMessageId: response.agent_message_id!,
  feedback: true
});

// Remove the feedback if the user changes their mind
await conversation.removeFeedback({
  agentMessageId: response.agent_message_id!
});
```

## Connector Status

Check the connection status of an agent's connector.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");

// Send a message that might require a connector
const response = await conversation.sendMessage("I need a summary of my latest meeting notes stored in google drive");

// Here the user should complete the authentication process.

// Check connector status for this conversation (you can use a loop to check every 5 seconds)
const status = await conversation.getConnectorStatus({
  agentInstanceId: conversation.conversationId!,
  // get the connector id using response.pending_actions[index].connector_id
  connectorId: "connector-uuid"
});

console.log(status.isConnected); // true or false

// You can use this to determine if a connector needs authentication
if (!status.isConnected) {
  console.log("Connector is not connected. Please authenticate.");
  // After user authenticates the connector...
}

// Once connected, send the message again
// The agent will now have access to Google Drive to retrieve the meeting notes
const newResponse = await conversation.sendMessage("I need a summary of my latest meeting notes stored in google drive");
console.log(newResponse.content); // Summary of the meeting notes
```

## Tool approvals

When a skill is configured as *Requires approval*, the run pauses instead of invoking it. The result
carries an `approval` pending action, and the conversation stays blocked until you send a decision:
any further message on it returns HTTP 400 with `errors["tool_approval_pending"]` (see
[Validation errors](#validation-errors)).

Detect the request on the result (or on the `stop` payload when streaming) and resolve it with
`streamToolApprovals` / `sendToolApprovals`. The resume turn carries **no user message** — the
decision is the whole turn — and continues the same conversation, so the answer arrives as the rest
of the same assistant response.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("chef-assistant");

const response = await conversation.streamMessage("What are the trending recipes this week?");

const approval = response.pending_actions?.find((action) => action.type === "approval");

if (approval) {
  console.log(approval.skill_code); // "web-search" — the skill awaiting approval

  // Ask the user, then echo the request id back with their decision.
  const continuation = await conversation.streamToolApprovals([
    { requestId: approval.request_id, approved: true },
  ]);

  console.log(continuation.content); // the rest of the answer
}
```

Notes:

- `request_id` is the only value that must be echoed back. `call_id`, `skill_type`, `tool` and
  `arguments` are informational.
- Decision members are camelCase (`requestId`, `approved`, `reason?`). `reason` is optional and
  omitted from the request when empty.
- Approvals can only be resolved on an existing conversation — both methods throw when
  `conversation.conversationId` is not set yet. It is populated as soon as the first execution
  finishes, so an approval raised on the very first turn is resolvable.
- A resumed turn can itself raise another approval; keep handling `pending_actions` until it is empty.

## User choices

When the agent needs input before it can continue, it stops and asks. The result carries a
`user_choice` pending action holding one or more questions, each with the options the agent
proposes.

Detect it on the result (or on the `stop` payload when streaming) and answer with
`streamUserChoices` / `sendUserChoices`. The resume turn carries **no user message** — the answers
are the whole turn — and continues the same conversation, so the answer arrives as the rest of the
same assistant response.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("chef-assistant");

const response = await conversation.streamMessage("Plan dinner for me tonight.");

const choice = response.pending_actions?.find((action) => action.type === "user_choice");

if (choice) {
  for (const question of choice.questions) {
    console.log(question.header);        // "Cuisine" — short label, frequently absent
    console.log(question.text);          // "What kind of food are you in the mood for?"
    console.log(question.is_multiselect) // false — pick one, or many when true
    console.log(question.options);       // [{ id, title, description? }, ...]
  }

  // Ask the user, then echo each question id back with the option ids they picked.
  const continuation = await conversation.streamUserChoices(
    choice.questions.map((question) => ({
      questionId: question.id,
      selectedOptionIds: [question.options![0].id],
    })),
  );

  console.log(continuation.content); // the rest of the answer
}
```

When none of the options fit, send the user's own words in `other` instead — with or without
selected options:

```tsx
await conversation.sendUserChoices([
  { questionId: question.id, selectedOptionIds: [], other: "Something vegetarian" },
]);
```

Notes:

- `questionId` must match a question's `id`, and every id in `selectedOptionIds` must match one of
  that question's `options`. `header`, `text` and `description` are informational.
- Answer members are camelCase (`questionId`, `selectedOptionIds`, `other?`). `other` is optional,
  trimmed, and omitted from the request when empty.
- Answer every question in the set. `selectedOptionIds` may be empty only when `other` carries the
  answer instead.
- Unlike approvals, nothing is held server-side: the answers are folded into the text of the next
  user message. An unanswered set never expires, so it can be answered on a later turn, and a plain
  `sendMessage` / `streamMessage` also works if the user would rather just reply in their own words.
- User choices can only be answered on an existing conversation — both methods throw when
  `conversation.conversationId` is not set yet. It is populated as soon as the first execution
  finishes, so a question raised on the very first turn is answerable.
- A resumed turn can itself raise another question; keep handling `pending_actions` until it is empty.

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

> **Errors:** A failing execution rejects with a normalized error body — including
> `agent_run_failed`, which carries every model attempt in `attempts[]`. See
> [Error handling](#error-handling).

> **Token Provider Auth:** Omit `agentCode`.
> ```ts
> const response = await client.agents.activities.execute();
> // with options:
> const response = await client.agents.activities.execute({ inputParameters: { targetLanguage: "russian", textToTranslate: "hello world" } });
> ```

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
  // In-band failure: `error.code` is set, `statusCode` is not.
  // See "Streaming vs. buffered errors" under Error handling.
});

const response = await activity.stream()

// Access final response data
console.log(
  response.content, // Привет, мир!
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }]
);
```

> **Stream errors:** A streamed run that fails still completes with HTTP 200 — the failure arrives as an in-band `error` event **and** rejects the promise with the same object, which carries no `statusCode`. See [Streaming vs. buffered errors](#streaming-vs-buffered-errors).

> **Token Provider Auth:** Omit `agentCode` from `create()`.
> ```ts
> const activity = client.agents.activities.create({ inputParameters: { targetLanguage: "russian", textToTranslate: "hello world" } })
> ```

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

> **Token Provider Auth:** Omit `agentCode`.
> ```ts
> const response = await client.agents.proxies.execute({ model: "gpt-4o-mini-2024-07-18", messages: [{ role: "user", content: "What is artificial intelligence?" }] });
> ```

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

> **Stream errors:** A streamed run that fails still completes with HTTP 200 — the failure arrives as an in-band `error` event **and** rejects the promise with the same object, which carries no `statusCode`. See [Streaming vs. buffered errors](#streaming-vs-buffered-errors).

> **Token Provider Auth:** Omit `agentCode` from `create()`.
> ```ts
> const proxy = client.agents.proxies.create({ model: "gpt-4o-mini-2024-07-18", messages: [{ role: "user", content: "What is artificial intelligence?" }] })
> ```

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
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);

```

> **Token Provider Auth:** Omit `agentCode`.
> ```ts
> const response = await client.agents.chatCompletions.execute({ message: "Hello!!!" });
> ```

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
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);
```

> **Stream errors:** A streamed run that fails still completes with HTTP 200 — the failure arrives as an in-band `error` event **and** rejects the promise with the same object, which carries no `statusCode`. See [Streaming vs. buffered errors](#streaming-vs-buffered-errors).

> **Token Provider Auth:** Omit `agentCode` from `create()`.
> ```ts
> const chatCompletion = client.agents.chatCompletions.create({ message: "Hi! How can I eat healthier?" })
> ```

---

# Shared Features

## Download Attached Files

Download files attached to assistant/copilot messages through the SDK (auth handled automatically for both API Key and Token Provider modes).

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("document-analyzer");

// Example attachment URL from message.attached_volatile_knowledges[index].download_url
const blob = await conversation.downloadAttachment("https://api.serenitystar.ai/api/file/download/<file-id>");

// Trigger browser download
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "document.pdf";
a.click();
URL.revokeObjectURL(url);
```

> **Token Provider Auth:** Same API.
> ```ts
> const client = new SerenityClient({
>   agentClientCredentials: { agentCode: "chef-assistant", publicKey: "<PUBLIC_KEY>", tokenProvider },
> });
>
> const conversation = await client.agents.assistants.createConversation();
> const blob = await conversation.downloadAttachment("https://api.serenitystar.ai/api/file/download/<file-id>");
> ```

## Stop Streaming Response

You can stop a streaming response at any time by calling `stop()`. This works across all agent types: **Assistants**, **Copilots**, **Activities**, **Proxies**, and **Chat Completions**.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Stop a streaming conversation (Assistants / Copilots)
const conversation = await client.agents.assistants.createConversation("chef-assistant");

conversation
  .on("content", (chunk) => {
    console.log(chunk);

    // Stop the stream based on any condition
    if (shouldStop) {
      conversation.stop();
    }
  });

await conversation.streamMessage("Tell me a long story about pasta");

// Stop a streaming activity (Activities / Proxies / Chat Completions)
const activity = client.agents.activities.create("translator-activity", {
  inputParameters: {
    targetLanguage: "russian",
    textToTranslate: "hello world"
  }
})
.on("content", (chunk) => {
  console.log(chunk);

  if (shouldStop) {
    activity.stop();
  }
});

await activity.stream();
```

## Reasoning (Chain-of-Thought)

When an agent is configured with a reasoning-capable model, its chain-of-thought is streamed incrementally through the `reasoning` event, separate from the final answer delivered on `content`. This works across all streaming agent types: **Assistants**, **Copilots**, **Activities**, **Proxies**, and **Chat Completions**.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("chef-assistant");

conversation
  .on("reasoning", (chunk) => {
    process.stdout.write(chunk); // Stream the model's thinking as it happens
  })
  .on("content", (chunk) => {
    process.stdout.write(chunk); // The final answer
  });

await conversation.streamMessage("Plan a three-course vegetarian dinner");
```

## Task events

While an agent streams, it reports the internal work it performs through the `task_start` / `task_stop` event pair. A **task** is any discrete step the agent runs on its way to an answer — a skill execution, a tool call, and whatever step types the platform adds later. The SDK forwards every task frame it receives without filtering, so new task types reach your handlers as soon as the platform starts emitting them.

Use them to reflect the agent's progress in your UI while it works, or to time, trace and log what the agent actually did.

These events only exist on **streamed** executions (`streamMessage` / `stream`). A non-streamed call returns the final result only.

Each task carries a `task_key` identifying what ran and a `metadata` object describing it. Both are task-type specific: match on `task_key` for the types you care about and ignore the rest, rather than assuming a single shape.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("sales-assistant");

conversation
  .on("task_start", (task) => console.log("started", task.task, task.task_key))
  .on("task_stop", (task) =>
    console.log("finished", task.task_key, task.duration, task.success)
  )
  .on("content", (chunk) => process.stdout.write(chunk));

await conversation.streamMessage("What do we have in stock for vintage guitars?");
```

### `task_start` payload

| Field | Type | Description |
| --- | --- | --- |
| `type` | `string` | The event name, `task_start`. |
| `task` | `string` | Human-readable description of the task, safe to show in a UI. |
| `task_key` | `string` | Identifier of what ran. Its format depends on the task type. |
| `metadata` | `object` | Extra details about the task. Contents depend on the task type. |
| `start_time_utc` | `string` | When the task started (UTC). |
| `input` | `object` | The arguments the task was invoked with. Shape depends on the task. |

### `task_stop` payload

Same envelope as `task_start`, plus:

| Field | Type | Description |
| --- | --- | --- |
| `end_time_utc` | `string` | When the task finished (UTC). |
| `duration` | `string` | Elapsed time as a timespan string, e.g. `00:00:00.0002104`. |
| `success` | `boolean` | Whether the task completed successfully. |
| `output` | `any` | The task's result. Shape depends on the task. |

Unknown fields the server may add in the future are preserved on the payload — both types carry an index signature.

### Recognising a task type

Skill executions are one task type. Their `task_key` follows the `skills_<SkillCode>_execute` convention, and the skill is described under `metadata.skill`:

```json
{
  "type": "task_start",
  "task": "Executing Skill: GetProductInfo",
  "task_key": "skills_GetProductInfo_execute",
  "metadata": { "skill": { "type": "Prompt", "code": "GetProductInfo" } },
  "start_time_utc": "2026-08-24T10:22:54.1822224Z",
  "input": { "categoryName": "Music instruments from the 1960s" }
}
```

```tsx
conversation.on("task_start", (task) => {
  const skillCode = task.metadata?.skill?.code;
  if (skillCode) {
    showSpinner(`Running ${skillCode}…`);
  }
});
```

## Citations

When an agent grounds its response in knowledge sources (knowledge files or websites), it returns **citations** that map spans of the generated message back to the source passages they came from. Citations are available across all agent types that support knowledge grounding.

Citations are delivered in three places:

1. **Incrementally**, as the second argument of the `content` event during streaming.
2. **Consolidated**, as the `citations` array on the final result (`response.citations`) — available for both streamed and non-streamed executions.
3. **Persisted**, on each `Message` loaded from conversation history (`message.citations`) — see [Citations on stored messages](#citations-on-stored-messages) below.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

const conversation = await client.agents.assistants.createConversation("policy-assistant");

conversation.on("content", (chunk, citations) => {
  process.stdout.write(chunk);

  if (citations) {
    for (const citation of citations) {
      console.log(
        citation.citation_index, // Display number rendered as the superscript (may repeat)
        citation.start_index,    // Offset into the FULL accumulated message where the cited span starts
        citation.end_index,      // Offset into the FULL accumulated message where the cited span ends
        citation.relevance,      // Optional relevance score
        citation.cited_text,     // Verbatim text of the source passage (shown in the hover card)
        citation.source          // The cited source (see below), or null
      );
    }
  }
});

const response = await conversation.streamMessage("Summarize our security and access-control requirements");

// The final result carries the consolidated citation list
for (const citation of response.citations ?? []) {
  if (citation.source?.type === "knowledge_file") {
    console.log(`[${citation.citation_index}] ${citation.source.file_name} (pages ${citation.source.page_range})`);
  } else if (citation.source?.type === "knowledge_website") {
    console.log(`[${citation.citation_index}] ${citation.source.website}`);
  }
}
```

> **Note:** `start_index` and `end_index` are offsets into the **full accumulated message**, not into the individual chunk delivered by a `content` event. Accumulate the chunks (or use `response.content`) before resolving these offsets.

The `CitationRes`, `CitationResWithoutText`, and `CitationSource` types are exported from the package:

```ts
import type { CitationRes, CitationResWithoutText, CitationSource } from '@serenity-star/sdk';

type CitationSource =
  | {
      type: "knowledge_file";
      knowledge_file_version_id?: string;
      section_id?: string;
      file_name?: string;
      page_range?: string;
      is_downloadable?: boolean; // Whether the cited file can be downloaded by authorized users
    }
  | {
      type: "knowledge_website";
      knowledge_file_version_id?: string;
      section_id?: string;
      website: string;
    };

type CitationRes = {
  cited_text: string;      // Verbatim text of the source passage (shown in the hover card)
  citation_index: number;  // Display number rendered as the superscript; may repeat across citations
  start_index: number;     // Offset into the FULL accumulated message where the cited span starts
  end_index: number;       // Offset into the FULL accumulated message where the cited span ends
  relevance?: number;
  source: CitationSource | null;
};

// Same shape as CitationRes but without `cited_text`. Used for citations on
// messages loaded from conversation history (see "Get conversation by id").
type CitationResWithoutText = {
  citation_index: number;
  start_index: number;
  end_index: number;
  relevance?: number;
  source: CitationSource | null;
};
```

### Citations on stored messages

Citations are also persisted on the conversation history. When you load past messages via [Get conversation by id](#get-conversation-by-id) (or read `conversation.messages`), each `Message` may carry a `citations` array of type `CitationResWithoutText[]` — the same shape as `CitationRes` but **without** the `cited_text` field (the verbatim passage is not stored alongside historical messages).

```tsx
const conversation = await client.agents.assistants.getConversationById("policy-assistant", "<conversation-id>");

for (const message of conversation.messages) {
  for (const citation of message.citations ?? []) {
    console.log(
      citation.citation_index, // Display number rendered as the superscript (may repeat)
      citation.start_index,    // Offset into the message `value` where the cited span starts
      citation.end_index,      // Offset into the message `value` where the cited span ends
      citation.relevance,      // Optional relevance score
      citation.source          // The cited source (knowledge_file / knowledge_website), or null
    );
  }
}
```

### Downloading a cited knowledge file

When an agent's knowledge file is configured as available for download, its citations carry
`is_downloadable`. The download endpoint requires authentication, so a plain `<a href>` will not
work. Use `downloadKnowledgeFile` with the citation's `knowledge_file_version_id`: it addresses the
conversation's own agent and version, and attaches the client's API key or bearer token.

```tsx
for (const citation of response.citations ?? []) {
  const source = citation.source;
  if (source?.type !== "knowledge_file" || !source.is_downloadable) continue;
  if (!source.knowledge_file_version_id) continue;

  const blob = await conversation.downloadKnowledgeFile(source.knowledge_file_version_id);

  // In the browser, hand the blob to the user
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = source.file_name ?? "download";
  link.click();
  URL.revokeObjectURL(objectUrl);
}
```

Notes:

- Branch on `is_downloadable`. It already covers non-downloadable files and draft versions, and a
  file that stops being downloadable answers `404` on the next attempt.
- Private, deleted, or missing files all answer `404` — deliberately indistinguishable.
- Citations loaded from history via [Get conversation by id](#get-conversation-by-id) do **not**
  currently include `is_downloadable`.

## Upload Files (Volatile Knowledge)

Upload files to be used as context in your agent executions. This feature is available for all agent types: **Assistants**, **Copilots**, **Activities**, **Proxies**, and **Chat Completions**. Files are agent-scoped automatically and are included in the next message or execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Works with any agent type (Assistant, Copilot, Activity, Proxy, Chat Completion)
const conversation = await client.agents.assistants.createConversation("document-analyzer");

// Check the file types supported by this specific agent
const supportedMimeTypes = await conversation.volatileKnowledge.getSupportedMimeTypes();
console.log("Supported MIME types:", supportedMimeTypes);

// Upload a file (basic example)
const file = new File(["content"], "document.pdf", { type: "application/pdf" });
const uploadResult = await conversation.volatileKnowledge.upload(file);

// Check if upload was successful
if (uploadResult.success) {
  console.log(
    uploadResult.id,              // File ID
    uploadResult.fileName,         // "document.pdf"
    uploadResult.fileSize,         // Size in bytes
    uploadResult.expirationDate,   // When the file will be deleted
    uploadResult.status            // "analyzing", "invalid", "success", "error", or "expired"
  );
  
  // Send a message or execute - the uploaded file will be automatically included
  const response = await conversation.sendMessage("What are the main points in this document?");
  console.log(response.content); // Analysis based on the uploaded file
} else {
  // Handle upload errors
  console.error("Upload failed:", uploadResult.error);
}

// Upload with options
const imageFile = new File(["image data"], "chart.png", { type: "image/png" });
const uploadWithOptions = await conversation.volatileKnowledge.upload(imageFile, {
  useVision: true,              // Enable vision for image files (automatically skips embeddings for images)
  processEmbeddings: false,     // Optional: explicitly control embeddings generation
  noExpiration: false,          // File will expire (default behavior)
  expirationDays: 7,           // Custom expiration in days
  locale: {
    uploadFileErrorMessage: "Failed to upload file. Please try again." // You can optionally provide localized error messages
  }
});

if (uploadWithOptions.success) {
  // The file is now ready to be used in the next message/execution
  const response = await conversation.sendMessage("Describe what you see in this chart");
  console.log(response.content);
}

// Create volatile knowledge from an existing platform file ID
const fromFileId = await conversation.volatileKnowledge.uploadFromFileId("existing-file-id", {
  callbackUrl: "https://example.com/volatile-knowledge/callback",
  processEmbeddings: true,
  expirationDays: 7,
});

// Create volatile knowledge from a remote URL
const fromUrl = await conversation.volatileKnowledge.uploadFromUrl("https://example.com/report.pdf", {
  fileName: "report.pdf",
  processEmbeddings: true,
  noExpiration: false,
});

// Create volatile knowledge from base64 content
const fromBase64 = await conversation.volatileKnowledge.uploadFromBase64(contentBase64, {
  fileName: "report.pdf",
  mimeType: "application/pdf",
  processEmbeddings: true,
  expirationDays: 7,
});

// Check file status by ID
const fileStatus = await conversation.volatileKnowledge.getById(uploadResult.id);

if (fileStatus.success) {
  console.log(
    fileStatus.status,           // "analyzing", "invalid", "success", "error", or "expired"
    fileStatus.fileName,         // "document.pdf"
    fileStatus.fileSize,         // Size in bytes
    fileStatus.expirationDate    // When the file will be deleted
  );
} else {
  console.error("Failed to fetch file status:", fileStatus.error);
}

// Remove a specific file from the queue
const file1 = new File(["content 1"], "doc1.pdf", { type: "application/pdf" });
const file2 = new File(["content 2"], "doc2.pdf", { type: "application/pdf" });

const upload1 = await conversation.volatileKnowledge.upload(file1);
const upload2 = await conversation.volatileKnowledge.upload(file2);

if (upload1.success && upload2.success) {
  // Remove only the first file
  conversation.volatileKnowledge.removeById(upload1.id);
  
  // Now only file2 will be included in the next message/execution
  const response = await conversation.sendMessage("Analyze these documents");
  console.log(response.content);
}

// Clear all files from the queue
await conversation.volatileKnowledge.upload(file1);
await conversation.volatileKnowledge.upload(file2);

// Clear all pending files
conversation.volatileKnowledge.clear();

// No files will be included in this message/execution
const response = await conversation.sendMessage("Hello");
```

> **Errors:** Uploads **return** failures instead of throwing, and `result.error.error` is a
> `SerenityApiError` only when the request reached the API — a local failure is a plain `Error`.
> See [File upload errors](#file-upload-errors) for the narrowing pattern and for what differs
> between `upload` and the `uploadFrom*` helpers.

## Audio Input

The SDK provides audio input capabilities across different agent types, allowing you to send audio messages and transcribe audio files.

### Send Audio Messages (Assistants/Copilots)

Send audio messages directly in conversations with assistants and copilots. The audio will be automatically transcribed and processed by the agent.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
const conversation = await client.agents.assistants.createConversation("chef-assistant");

// Send an audio message (basic example)
const audioBlob = new Blob([audioData], { type: 'audio/webm' });
const response = await conversation.sendAudioMessage(audioBlob);

console.log(
  response.content,              // AI-generated response
  response.completion_usage,     // Token usage information
  response.executor_task_logs    // Task execution logs
);

// Send an audio message with options
const responseWithOptions = await conversation.sendAudioMessage(audioBlob, {
  inputParameters: {
    cuisine: "italian"
  },
  volatileKnowledgeIds: ["knowledge-id-1"]
});

// Stream an audio message with SSE
conversation
  .on("content", (chunk) => {
    console.log(chunk); // Response chunk
  })
  .on("error", (error) => {
    console.error("Error:", error);
  });

const streamResponse = await conversation.streamAudioMessage(audioBlob);
console.log(streamResponse.content); // Final response
```

### Execute with Audio (Activities/Proxies/Chat Completions)

Execute activities, proxies, and chat completions with audio input. The audio will be processed and used as input for the agent execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Example with Activity
const activity = client.agents.activities.create("voice-analyzer");
const audioBlob = new Blob([audioData], { type: 'audio/webm' });

// Execute with audio
const activityResponse = await activity.executeWithAudio(audioBlob);
console.log(activityResponse.content);

// Stream with audio
activity
  .on("content", (chunk) => console.log(chunk))
  .on("error", (error) => console.error(error));

const streamResponse = await activity.streamWithAudio(audioBlob);
console.log(streamResponse.content);

// Example with Proxy
const proxy = client.agents.proxies.create("proxy-agent", {
  model: "gpt-4o-mini-2024-07-18",
  messages: [{ role: "user", content: "Analyze this audio" }]
});

const proxyResponse = await proxy.executeWithAudio(audioBlob);
console.log(proxyResponse.content);

// Example with Chat Completion
const chatCompletion = client.agents.chatCompletions.create("audio-assistant", {
  message: "Process this audio"
});

const chatResponse = await chatCompletion.executeWithAudio(audioBlob);
console.log(chatResponse.content);
```

## Audio Transcription Service

Use the dedicated audio transcription service to transcribe audio files independently from agent executions. The transcript can then be used as text input in conversations.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Transcribe an audio file
const audioFile = new File([audioBlob], "recording.mp3", { type: "audio/mpeg" });

const result = await client.services.audio.transcribe(audioFile, {
  modelId: '[YOUR_MODEL_ID]',           // Optional: Specify transcription model
  prompt: 'This is a conversation about AI', // Optional: Provide context
  userIdentifier: 'user123'              // Optional: User identifier
});

console.log('Transcript:', result.transcript);
console.log('Language:', result.metadata?.language);
console.log('Duration:', result.metadata?.duration, 'seconds');
console.log('Total tokens:', result.tokenUsage?.totalTokens);
console.log('Cost:', result.cost?.total, result.cost?.currency);

// Use the transcript in a conversation
const conversation = await client.agents.assistants.createConversation("chef-assistant");
const response = await conversation.sendMessage(result.transcript);
console.log(response.content); // AI response based on the transcribed audio
```

> **Token Provider Auth:** `client.services.audio` is not available with this auth mode. Audio transcription requires API Key authentication.

# Error handling

Every failing request rejects with a normalized **error body**. The SDK reads it once and keeps
everything the server sent.

> **The one rule:** branch on `code`. Not on `message` (localized, server-authored prose that
> changes without notice), and not on the HTTP status alone (a `429` is either a platform rate
> limit *or* an upstream provider throttle).

## The error envelope

```ts
type BaseErrorBody = {
  message: string;              // localized, human-readable. Display it; never branch on it.
  statusCode: number;           // the HTTP status
  code?: SerenityErrorCode;     // stable, machine-readable discriminator
  documentationUrl?: string;    // server-supplied doc link
  errors?: { [key: string]: string | string[] }; // field / detail breakdown
};
```

```tsx
try {
  const response = await conversation.sendMessage("Hello!");
  console.log(response.content);
} catch (error) {
  const err = error as BaseErrorBody;

  switch (err.code) {
    case "resource_not_found":
      // The agent, version or conversation does not exist — see `errors` for which.
      break;
    case "rate_limit_exceeded":
      // Platform throttle. `retryAfter` is set when the server sent `Retry-After`.
      break;
    case "vendor_service_error":
      // The AI provider is down. Safe to retry.
      break;
    default:
      showToast(err.message);
  }
}
```

`code` is optional so the SDK keeps working against an API instance that does not send it: when
it is absent, the error is mapped from the HTTP status alone.

Every narrowed shape extends `BaseErrorBody`, so `message` and `statusCode` are always readable
without narrowing. Cast to a narrowed type when you want the extra fields typed:

| Type | `code` | Adds |
| --- | --- | --- |
| `ValidationErrorBody` | — | `errors`, declared required — the legacy 400 shape |
| `BusinessValidationErrorBody` | `validation_error` | `errors` keyed by [`ValidationErrorKey`](#validation-errors) |
| `VendorValidationErrorBody` | `vendor_validation_error` | `errors.vendor_error` — the provider's own wording |
| `NotFoundErrorBody` | `resource_not_found` | `errors` keyed by [`NotFoundErrorKey`](#not-found-errors) |
| `VendorErrorBody` | one of `VendorFaultCode` | — |
| `AgentRunFailedErrorBody` | `agent_run_failed` | `attempts[]` |
| `RateLimitErrorBody` | `rate_limit_exceeded` | `retryAfter` |
| `SerenityErrorBody` | — | the union of every shape above |

> **⚠️ `ValidationErrorBody.errors` is declared required, but a coded 400 can arrive with no
> `errors` map at all.** The type does not protect you — read it optionally (`err.errors?.…`)
> even after casting. See [Validation errors](#validation-errors).

## Branch on `code`, never on `message`

Two details that are easy to get wrong:

1. **An `errors` key does not imply a status.** `agent_code_invalid` is a
   [`validation_error`](#validation-errors) key on a **400** (the agent exists but is not usable)
   *and* a [`resource_not_found`](#not-found-errors) key on a **404** (no such agent). Read `code`
   or `statusCode` first, the key second.
2. **Never detect vendor faults with a `"vendor_"` prefix check.** `vendor_validation_error` is
   a **400** the caller has to fix — retrying it will fail forever. Use the exported
   `VENDOR_FAULT_CODES` list, or `ErrorHelper.isVendorFault(error)`.

```tsx
import { ErrorHelper, VENDOR_FAULT_CODES } from "@serenity-star/sdk";
import type { BaseErrorBody } from "@serenity-star/sdk";

const err = error as BaseErrorBody;

// ✅ the helper…
if (ErrorHelper.isVendorFault(err)) await retryWithBackoff();

// ✅ …or the exported list it reads, when you want the check inline
if ((VENDOR_FAULT_CODES as readonly string[]).includes(err.code ?? "")) {
  await retryWithBackoff();
}

// ❌ classifies `vendor_validation_error` (a 400) as retryable
if (err.code?.startsWith("vendor_")) await retryWithBackoff();
```

A caught value is `unknown` under `strict`, so every example here casts it before reading
`code`. Cast once, at the top of the `catch`.

`ErrorHelper.determineErrorType(error)` classifies a thrown value when you want one branch per
family:

```tsx
import type { SerenityErrorType } from "@serenity-star/sdk";

const { type, error: body } = ErrorHelper.determineErrorType(error);
// SerenityErrorType:
// "RateLimitError" | "ValidationError" | "NotFoundError" | "VendorError"
// | "AgentRunFailedError" | "BaseError" | "UnknownError"
```

Annotate your own handlers with the exported `SerenityErrorType` rather than re-listing the
members.

> **Upgrading from 2.x:** the returned `type` values changed — a vendor `429` is no longer
> `"RateLimitError"`, and three members were added. See [Migrating from 2.x](#migrating-from-2x).

## Error code reference

| `code` | HTTP | Meaning | What to do |
| --- | --- | --- | --- |
| `unauthorized` | 401 | Missing or invalid credentials | Check the API key / token provider. Do not retry unchanged |
| `forbidden` | 403 | Authenticated, but not allowed | Do not retry |
| `input_validation_error` | 400 | Request binding / shape is wrong | Fix the request. `errors` is keyed by **request field**, values are arrays |
| `validation_error` | 400 | A business rule rejected the request | Fix the request or the agent state. `errors` may be absent |
| `vendor_validation_error` | 400 | The AI provider rejected the request (usually context length) | Shorten the input. **Not** a retryable vendor fault |
| `agent_run_failed` | 400 / 502 | Every model attempt failed. 400 when a client fix is possible, 502 when all attempts failed upstream | Read `attempts[]` |
| `request_too_large` | 413 | Payload over the limit | Send less |
| `method_not_allowed` | 405 | Wrong HTTP method | Fix the call |
| `unsupported_media_type` | 415 | Wrong `Content-Type` | Fix the call |
| `resource_not_found` | 404 | Agent, version, conversation or model does not exist | Read `errors` for which one |
| `rate_limit_exceeded` | 429 | **Platform** rate limit | Back off; use `retryAfter` when present |
| `vendor_rate_limit_error` | 429 | The **AI provider** is throttling us | Back off and retry. No `retryAfter` |
| `vendor_authentication_error` | 502 | The platform's provider credentials failed | Escalate — the caller cannot fix this |
| `vendor_service_error` | 503 | The AI provider is unavailable | Retry with backoff |
| `vendor_timeout_error` | 504 | The AI provider timed out | Retry with backoff |
| `vendor_error` | 500 | Provider fault with no status to map | Retry once, then escalate |
| `server_error` | 500 | Catch-all. Never exposes internal detail | Retry once, then escalate |

The `SerenityErrorCode` type keeps an open tail, so a code added server-side is a runtime value
you can handle rather than a compile error.

## Validation errors

A **400** is one of three codes: `input_validation_error` (the request shape is wrong),
`validation_error` (a business rule rejected it) or `vendor_validation_error` (the provider
rejected it — see [Vendor faults vs. vendor validation](#vendor-faults-vs-vendor-validation)).

The two validation codes key `errors` differently:

- **`input_validation_error`** — keys are **request field names**, values are **arrays**.
- **`validation_error`** — keys come from the vocabulary below, values are **single strings**.

⚠️ **`errors` can be absent on a 400.** Some business rules return a message only, so read it
optionally even when the type declares it required:

```tsx
try {
  await conversation.sendMessage("Hello!");
} catch (error) {
  const err = error as BusinessValidationErrorBody;
  if (err.code !== "validation_error") throw error;

  if (err.errors?.insufficient_balance) return showBillingDialog();
  if (err.errors?.conversation_closed) return startNewConversation();
  showToast(err.message);
}
```

| Group | `errors` keys |
| --- | --- |
| Request input | `message_required`, `invalid_request_body`, `input_keys_duplicated`, `multiple_inputs`, `required_parameters_missing`, `required_parameters_null`, `required_parameters_empty`, `parameter_type_mismatch`, `missing_variables`, `invalid_messages`, `audio_input_not_supported` |
| Agent state | `agent_inactive`, `agent_code_invalid`, `agent_version_inactive`, `ai_model_not_allowed`, `invalid_model` |
| Conversation | `conversation_closed`, `conversation_context_not_found` |
| Response format & reasoning | `invalid_response_format_type`, `invalid_response_format_schema`, `response_format_not_supported_by_model`, `invalid_reasoning_effort`, `invalid_reasoning_detail`, `reasoning_effort_not_supported_by_model`, `reasoning_detail_not_supported_by_model` |
| Skills & tools | `invalid_skills_options`, `conflicting_skills_options`, `tool_approval_pending` (see [Tool approvals](#tool-approvals)), `tool_approval_skill_not_found`, `tool_approval_ambiguous_tool` |
| Quota & balance | `insufficient_balance`, `monthly_quota_exceeded`, `user_quota_exceeded`, `organization_quota_exceeded`, `model_quota_exceeded`, `excluded_bonified_execution_insufficient_balance` |

`ValidationErrorKey` keeps an open tail — the agent-designer endpoints add namespaced,
feature-specific keys, so keep a `default` branch.

⚠️ **A key does not imply a status.** `agent_code_invalid` is an *agent state* key on this 400
*and* a [`resource_not_found`](#not-found-errors) key on a 404. Read `code` or `statusCode` first.

> **Upgrading from 2.x:** 2.x always set `errors` on a 400, defaulting it to `{}`. A coded 400 now
> omits it when the server sent none. See [Migrating from 2.x](#migrating-from-2x).

## Not found errors

A missing agent, version, conversation or model comes back as a **404** with
`code: "resource_not_found"` and an `errors` key naming what is missing:

```json
{
  "code": "resource_not_found",
  "message": "The resource you're trying to see was not found (Code 0040)",
  "errors": { "agent_code_invalid": "Agent 'chef-assistant' does not exist." }
}
```

| `errors` key | What is missing |
| --- | --- |
| `agent_code_invalid` | No agent with that code |
| `agent_version_not_found` | The agent exists, that version does not |
| `conversation_not_found` | No conversation with that id |
| `aimodel_not_found` | The requested model does not exist |

`errors` is **absent** on an unspecified miss — the reason is then in `message`.

⚠️ `agent_code_invalid` is also a 400 key — see [Validation errors](#validation-errors).

```tsx
try {
  await conversation.getInfo();
} catch (error) {
  const err = error as NotFoundErrorBody;
  if (err.code === "resource_not_found") {
    if (err.errors?.agent_code_invalid) return showAgentPicker();
    if (err.errors?.agent_version_not_found) return showVersionPicker();
    showToast(err.message);
  }
}
```

## Vendor faults vs. vendor validation

Failures inside the upstream AI provider surface as their own statuses. All five carry a
`vendor_*` code, and all five are worth retrying or escalating:

| `code` | HTTP |
| --- | --- |
| `vendor_rate_limit_error` | 429 |
| `vendor_authentication_error` | 502 |
| `vendor_service_error` | 503 |
| `vendor_timeout_error` | 504 |
| `vendor_error` | 500 |

`vendor_validation_error` (**400**) is deliberately *not* in that list: the provider rejected the
request itself, typically because the prompt exceeded the model's context window. Retrying it
unchanged will always fail. The provider's own wording is in `errors.vendor_error`:

```tsx
const err = error as VendorValidationErrorBody;

if (err.code === "vendor_validation_error") {
  console.log(err.errors?.vendor_error);
  // "This model's maximum context length is 8192 tokens…"
  return trimConversationAndRetry();
}
```

A vendor fault can also carry a per-item `errors` map — for example per-file OCR failures keyed
by file name.

## Rate limiting

A `429` comes from either the platform or the AI provider, so check `code`:

```tsx
const err = error as RateLimitErrorBody;

if (err.code === "rate_limit_exceeded") {
  // Platform limit. `retryAfter` is in seconds, and is set when the server sent a
  // `Retry-After` header.
  await sleep((err.retryAfter ?? 30) * 1000);
} else if (err.code === "vendor_rate_limit_error") {
  // The AI provider is throttling. No `Retry-After` — use your own backoff.
  await retryWithBackoff();
}
```

> **Upgrading from 2.x:** `retryAfter` is no longer defaulted to `60`, and the `429` message is
> no longer the hardcoded string `"Rate limit exceeded"`. See
> [Migrating from 2.x](#migrating-from-2x).

## Failed agent runs and `attempts[]`

When an agent has fallback models configured, a failure reports every attempt. The top-level
`errors` mirrors only the **last** one, so read `attempts[]` for the full picture:

```tsx
try {
  await activity.execute();
} catch (error) {
  const err = error as AgentRunFailedErrorBody;
  if (err.code !== "agent_run_failed") throw error;

  for (const attempt of err.attempts ?? []) {
    console.log(attempt.index, attempt.modelType, attempt.code, attempt.statusCode);
    // 0 "main"     "vendor_rate_limit_error" 429
    // 1 "fallback" "vendor_service_error"    503
  }

  // 502 means every attempt failed upstream; 400 means at least one is client-fixable.
  if (err.statusCode === 502) await retryWithBackoff();
}
```

`modelType` is always `"main"` or `"fallback"` — never a model name. `statusCode` on an attempt
is the **provider's** raw status (429, 503, 529…) and is informational.

## Streaming vs. buffered errors

A streamed run that fails still completes with **HTTP 200** — the failure arrives as an in-band
`error` event. The SDK normalizes that frame, so a streamed and a buffered failure expose the
same fields:

| | Buffered (`sendMessage`, `execute`) | Streamed (`streamMessage`, `stream`) |
| --- | --- | --- |
| Delivery | promise rejection | `error` event **and** promise rejection, same object |
| `code` | ✅ | ✅ |
| `message` | always set | optional in the type — the SDK backfills a fallback |
| `errors` | ✅ | ✅ |
| `statusCode` | ✅ | **absent** — the transport reported 200 |
| Attempts | `attempts[]`, camelCase (`modelType`) | `attempts[]`, snake_case (`model_type`) |
| Partial output | — | `agent_result`, `pending_actions`, `generated_json` |

```tsx
conversation.on("error", (error) => {
  // error: StreamErrorEvent
  if (error?.code === "agent_run_failed") {
    error.attempts?.forEach((a) => console.log(a.model_type, a.status_code));
  }
  showToast(error?.message ?? "Something went wrong");
});

try {
  await conversation.streamMessage("Hello!");
} catch (error) {
  // The same object the `error` event received.
}
```

Streaming omits null fields, so every field on `StreamErrorEvent` is optional, `message`
included. In practice the SDK backfills a **hardcoded English** fallback when the frame carries
none (`"Failed to send message"`, `"Failed to resolve tool approvals"`, …), so `message` is
nearly always set but is not necessarily localized — supply your own copy wherever the wording is
user-facing.

A pre-stream failure — a 404, 429 or 502 raised before the stream opens — rejects with a normal
buffered error body, `statusCode` included. When the connection cannot be initialized at all —
no HTTP response to read — the rejection is a plain `Error`
(`"Failed to initialize SSE connection"`) with no `code`.

## File upload errors

`volatileKnowledge.upload` and the `uploadFrom*` helpers **return** a result object instead of
throwing. `result.error.error` is typed as a plain `Error`, because it is one of two things:

- a [`SerenityApiError`](#working-with-error-instances) when the request reached the API, so
  `code`, `statusCode` and `errors` are readable off it;
- a plain `Error` for a local failure — a missing argument (`"fileId is required."`) or a network
  fault. No `code`, no `statusCode`.

Narrow with `instanceof` before reading the envelope fields:

```tsx
import { SerenityApiError } from "@serenity-star/sdk";

const result = await conversation.volatileKnowledge.upload(file);

if (!result.success) {
  const { error, file: failedFile } = result.error;
  console.log(failedFile?.name);          // set on this path only

  if (error instanceof SerenityApiError) {
    console.log(error.message);           // "report.pdf: The file exceeds the maximum size."
    console.log(error.code);              // "input_validation_error"
    console.log(error.statusCode);        // 400
    console.log(error.errors?.file);      // ["The file exceeds the maximum size."]
  } else {
    showToast(error.message);             // local failure — envelope fields are absent
  }
}
```

**Only `upload(file)` prefixes `message` with the file name** and honours
`locale.uploadFileErrorMessage`. The prefixed text comes from the `errors` map when the server
sent one, otherwise from the top-level message.

The `uploadFromFileId` / `uploadFromUrl` / `uploadFromBase64` helpers differ: they report the
server's message **unprefixed**, they accept **no `locale` option** (their last-resort wording is
fixed), and `result.error.file` is absent because no `File` was involved.

```tsx
const result = await conversation.volatileKnowledge.uploadFromUrl("https://example.com/report.pdf");

if (!result.success) {
  // The server's message, with no "report.pdf: " prefix
  showToast(result.error.error.message);
}
```

> **Upgrading from 2.x:** an upload failure used to be a generic `500` with a generic message. It
> now carries the real status, `code` and `errors`. See [Migrating from 2.x](#migrating-from-2x).

## Realtime sessions

A realtime session reports failures on the WebSocket **close frame**, not over HTTP. The `error`
event carries structured detail alongside the display message:

```tsx
session.on("error", (message, details) => {
  showToast(message);

  switch (details?.source) {
    case "vendor":  // upstream provider fault
      offerRetry();
      break;
    case "session": // the Serenity session rejected the request
      console.log(details.reason, details.errors);
      break;
    case "client":  // microphone / WebRTC / local handling
      checkMicrophonePermissions();
      break;
  }
});

session.on("session.stopped", (reason, details) => {
  // `details` carries the raw close frame for an abnormal termination:
  // { closeCode: 1011, closeReason: "…", wasClean: false }
  console.log(reason, details);
});
```

`details.reason` is the server's close-frame reason, so it is only set when the failure arrived
on one: a `"vendor"` source reported from the live data channel carries **no `reason`**. Branch on
`details.source` and treat `reason` as extra detail.

The `errors` dictionary is surfaced for **any** close `reason`, including one this SDK version
does not recognise.

> **Upgrading from 2.x:** the `error` event gained the second `details` argument (existing
> one-argument handlers still work), and the provider-fault close `reason` was renamed
> `"ValidationException"` → `"VendorException"`. See [Migrating from 2.x](#migrating-from-2x).

## Working with `Error` instances

Agent-execution and conversation methods reject with **plain objects**, not `Error` instances.
Wrap a **buffered** error body when you need a real `Error` — for a stack trace, or for an
error-reporting tool that ignores non-`Error` values:

```tsx
import { SerenityApiError } from "@serenity-star/sdk";

try {
  await conversation.sendMessage("Hello!");
} catch (error) {
  const err = SerenityApiError.from(error as BaseErrorBody);
  err instanceof Error; // true
  Sentry.captureException(err);
}
```

Every envelope field is an own enumerable property, so `{ ...err }` and `JSON.stringify(err)`
produce exactly the plain error body.

Two cases it is **not** for:

- **A streamed error.** A `StreamErrorEvent` has no `statusCode` — the transport already reported
  200 — so wrapping one produces a `SerenityApiError` whose `statusCode` is `undefined` behind a
  `number` type. Report the frame as-is, or add a status of your own.
- **A failure that is already an `Error`.** A stream that never opens, an unparseable stored-message
  payload, and the local argument checks on the [upload helpers](#file-upload-errors) all reject
  with a plain `Error`. `SerenityApiError.from` expects a normalized body, so check
  `error instanceof Error` first when one `catch` handles both.

## Security notes

- **`message` and `errors` are server-authored, localized text.** They can embed resource names
  and, on vendor faults, upstream provider detail. Escape them before rendering into the DOM,
  and do not log them by default — the `console.log` calls in this section are debugging
  illustrations, not a recommended default.
- **`attempts[].message` and `attempts[].errors` carry the upstream provider's own wording** and
  inherit the same escaping and logging caveat as the top-level fields.
- **`documentationUrl` is a server-supplied URL.** Treat it as display text, not a navigation
  target, unless you validate the origin.
- **`agent_result` on a streamed error frame is diagnostic payload, not UI content.** It carries
  raw tool output and cost/usage. Do not render it verbatim.

---

# Migrating from 2.x

`3.0.0` is a major release because the shape of what is *thrown* changed. Nothing was removed
from `BaseErrorBody`, so most code keeps compiling — but two runtime behaviours changed, and they
are the first two rows below.

## Breaking changes

| Change | What to do |
| --- | --- |
| **`errors` is no longer guaranteed on a 400** | **The most likely runtime break.** 2.x set `errors` on every 400, defaulting it to `{}`; a coded 400 now omits it when the server sent none, so `Object.keys(err.errors)` and `err.errors.field` throw. Read it as `err.errors?.…`. Note `ValidationErrorBody` still declares the field **required**, so the type will not catch this for you. Against an API instance that sends no `code`, the legacy `{}` default still applies — the two behave differently |
| **A `429` message is the server's, not `"Rate limit exceeded"`** | 2.x ignored the body and hardcoded that English string. Any comparison against it now fails. Display `error.message` and branch on `code` |
| `RateLimitErrorBody.retryAfter` is optional | **Breaking for TypeScript.** 2.x defaulted it to `60` when the header was missing; it is now set only when the server sent `Retry-After`. Use `error.retryAfter ?? yourDefault` |
| A vendor `429` is no longer a `RateLimitError` | `determineErrorType` returns `"VendorError"` for it. Branch on `code` rather than on the returned type |
| `determineErrorType` gained `"NotFoundError"`, `"VendorError"` and `"AgentRunFailedError"` | Exhaustive `switch` statements over the returned `type` no longer compile. Add the new branches, or a `default`. The union is now exported as `SerenityErrorType` — annotate with it instead of re-listing the members |
| The SSE `error` event payload is `StreamErrorEvent` | **Breaking for TypeScript** if you typed the handler as `{ message?: string }`. `message` is still there |
| The realtime close `reason` for a provider fault is `"VendorException"` | Renamed from `"ValidationException"`. The SDK handles both; update your own comparisons on `reason` |

## Status code changes

These come from the API, so they affect any branching on `statusCode`. Branching on `code`
instead is stable across all of them.

| Change | What to do |
| --- | --- |
| A missing agent, version or conversation is a **404** | Was a 400. Add 404 to status-based branching, or move to `code: "resource_not_found"` |
| Vendor faults use **502 / 503 / 504** | Was 500. Code that only special-cased 500 sees new statuses |
| A vendor throttle is a **429** with `code: "vendor_rate_limit_error"` | A 429 no longer implies a platform rate limit |
| `agent_run_failed` is a **400** or a **502** | 400 when a client fix is possible, 502 when every attempt failed upstream |

## Additive changes and fixes

| Change | Kind | Notes |
| --- | --- | --- |
| `code`, `documentationUrl` and `errors` on `BaseErrorBody` | Additive | `errors` is preserved on **every** status, not just 400 |
| The realtime `error` event gained a second `details` argument | Additive | Existing one-argument handlers are unaffected |
| `volatileKnowledge` failures return a `SerenityApiError` | Additive | For API failures only — a local failure (missing argument, network fault) stays a plain `Error`. Both are `Error` instances with the same `message` as before |
| A streamed error rejects with the normalized frame | Fixed | Was the raw frame. Same fields, plus `code` and normalized `pending_actions` |
| `session.stopped` is emitted once per session | Fixed | Was emitted twice for a server-initiated close |
| A non-JSON or empty error body keeps its real status | Fixed | Was forced to `500` |
| `FileManager.upload` reports the real status and message | Fixed | Was always `500` with a generic message |
| A 400 request-validation error carries a real `message` | Fixed | The API renamed the field (`title` → `message`), which 2.x could not read — it rendered `"Validation error"` instead |
| The upload `errors` key is `file`, not `File` | Fixed | Both casings are accepted, so an older API instance still resolves |

If you only read `message` and `statusCode`, two things need a look: any access to `errors` on a
**400** (row 1), and any comparison against the old hardcoded `429` message (row 2). Everything
else is additive, or affects only `switch` statements over `determineErrorType`.
