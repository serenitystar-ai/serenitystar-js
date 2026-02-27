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
  - [Get conversation information](#get-conversation-information)
  - [Get conversation by id](#get-conversation-by-id)
  - [Sending messages within a conversation](#sending-messages-within-a-conversation)
    - [Stream message with SSE](#stream-message-with-sse)
  - [Real time conversation](#real-time-conversation)
  - [Message Feedback](#message-feedback)
    - [Submit feedback](#submit-feedback)
    - [Remove feedback](#remove-feedback)
  - [Connector Status](#connector-status)
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
  - [Stop Streaming Response](#stop-streaming-response)
  - [Upload Files (Volatile Knowledge)](#upload-files-volatile-knowledge)
  - [Audio Input](#audio-input)
    - [Send Audio Messages (Assistants/Copilots)](#send-audio-messages-assistantscopilots)
    - [Execute with Audio (Activities/Proxies/Chat Completions)](#execute-with-audio-activitiesproxieschat-completions)
    - [Audio Transcription Service](#audio-transcription-service)

# Installation

```bash
npm install @serenity-star/sdk
```

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
  agentInfo.agent.imageId // Agent's profile image ID
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
  conversation.messages, // Array of messages
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
  response.executor_task_logs, // [ { description: 'Task 1', duration: 100 }, { description: 'Task 2', duration: 500 }],
  response.instance_id, // instance id for the conversation
)
```

## Real time conversation

```tsx
import SerenityClient from '@serenity-star/sdk';

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
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
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
  response.completion_usage, // { completion_tokens: 200, prompt_tokens: 30, total_tokens: 230 }
);
```

---

# Shared Features

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

## Upload Files (Volatile Knowledge)

Upload files to be used as context in your agent executions. This feature is available for all agent types: **Assistants**, **Copilots**, **Activities**, **Proxies**, and **Chat Completions**. Files are automatically included in the next message or execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Works with any agent type (Assistant, Copilot, Activity, Proxy, Chat Completion)
const conversation = await client.agents.assistants.createConversation("document-analyzer");

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