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

## Upload Files (volatile knowledge)

Upload files to be used as context in your conversations. Files are automatically included in the next message sent.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create conversation with an assistant
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
    uploadResult.status            // "processing" or "ready"
  );
  
  // Send a message - the uploaded file will be automatically included
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
  // The file is now ready to be used in the next message
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
  
  // Now only file2 will be included in the next message
  const response = await conversation.sendMessage("Analyze these documents");
  console.log(response.content);
}

// Clear all files from the queue
await conversation.volatileKnowledge.upload(file1);
await conversation.volatileKnowledge.upload(file2);

// Clear all pending files
conversation.volatileKnowledge.clear();

// No files will be included in this message
const response = await conversation.sendMessage("Hello");
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

## Upload Files (volatile knowledge)

Upload files to be used as context in your activity execution. Files are automatically included in the next execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create activity instance
const activity = client.agents.activities.create("data-analyzer");

// Upload a file
const file = new File(["content"], "data.csv", { type: "text/csv" });
const uploadResult = await activity.volatileKnowledge.upload(file);

// Check if upload was successful
if (uploadResult.success) {
  console.log(
    uploadResult.id,              // File ID
    uploadResult.fileName,         // "data.csv"
    uploadResult.fileSize,         // Size in bytes
    uploadResult.expirationDate,   // When the file will be deleted
    uploadResult.status            // "analyzing", "invalid", "success", "error", or "expired"
  );
  
  // Execute the activity - the uploaded file will be automatically included
  const response = await activity.execute();
  console.log(response.content); // Analysis based on the uploaded file
} else {
  // Handle upload errors
  console.error("Upload failed:", uploadResult.error);
}

// Upload with options
const imageFile = new File(["image data"], "chart.png", { type: "image/png" });
const uploadWithOptions = await activity.volatileKnowledge.upload(imageFile, {
  useVision: true,              // Enable vision for image files (automatically skips embeddings for images)
  noExpiration: false,          // File will expire (default behavior)
  expirationDays: 7,           // Custom expiration in days
  locale: {
    uploadFileErrorMessage: "Failed to upload file. Please try again." // You can optionally provide localized error messages
  }
});

if (uploadWithOptions.success) {
  // The file is now ready to be used in the execution
  const response = await activity.execute();
  console.log(response.content);
}

// Check file status by ID
const fileStatus = await activity.volatileKnowledge.getById(uploadResult.id);

if (fileStatus.success) {
  console.log(
    fileStatus.status,           // "analyzing", "invalid", "success", "error", or "expired"
    fileStatus.fileName,         // "data.csv"
    fileStatus.fileSize,         // Size in bytes
    fileStatus.expirationDate    // When the file will be deleted
  );
} else {
  console.error("Failed to fetch file status:", fileStatus.error);
}

// Remove a specific file from the queue
const file1 = new File(["content 1"], "data1.csv", { type: "text/csv" });
const file2 = new File(["content 2"], "data2.csv", { type: "text/csv" });

const upload1 = await activity.volatileKnowledge.upload(file1);
const upload2 = await activity.volatileKnowledge.upload(file2);

if (upload1.success && upload2.success) {
  // Remove only the first file
  activity.volatileKnowledge.removeById(upload1.id);
  
  // Now only file2 will be included in the next execution
  const response = await activity.execute();
  console.log(response.content);
}

// Clear all files from the queue
await activity.volatileKnowledge.upload(file1);
await activity.volatileKnowledge.upload(file2);

// Clear all pending files
activity.volatileKnowledge.clear();

// No files will be included in this execution
const response = await activity.execute();
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

## Upload Files (volatile knowledge)

Upload files to be used as context in your proxy execution. Files are automatically included in the next execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create proxy instance
const proxy = client.agents.proxies.create("proxy-agent", {
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    { role: "user", content: "Analyze this document" },
  ],
});

// Upload a file
const file = new File(["content"], "report.pdf", { type: "application/pdf" });
const uploadResult = await proxy.volatileKnowledge.upload(file);

// Check if upload was successful
if (uploadResult.success) {
  console.log(
    uploadResult.id,              // File ID
    uploadResult.fileName,         // "report.pdf"
    uploadResult.fileSize,         // Size in bytes
    uploadResult.expirationDate,   // When the file will be deleted
    uploadResult.status            // "analyzing", "invalid", "success", "error", or "expired"
  );
  
  // Execute the proxy - the uploaded file will be automatically included
  const response = await proxy.execute();
  console.log(response.content); // Analysis based on the uploaded file
} else {
  // Handle upload errors
  console.error("Upload failed:", uploadResult.error);
}

// Upload with options
const imageFile = new File(["image data"], "diagram.png", { type: "image/png" });
const uploadWithOptions = await proxy.volatileKnowledge.upload(imageFile, {
  useVision: true,              // Enable vision for image files (automatically skips embeddings for images)
  noExpiration: false,          // File will expire (default behavior)
  expirationDays: 7,           // Custom expiration in days
  locale: {
    uploadFileErrorMessage: "Failed to upload file. Please try again." // You can optionally provide localized error messages
  }
});

if (uploadWithOptions.success) {
  // The file is now ready to be used in the execution
  const response = await proxy.execute();
  console.log(response.content);
}

// Check file status by ID
const fileStatus = await proxy.volatileKnowledge.getById(uploadResult.id);

if (fileStatus.success) {
  console.log(
    fileStatus.status,           // "analyzing", "invalid", "success", "error", or "expired"
    fileStatus.fileName,         // "report.pdf"
    fileStatus.fileSize,         // Size in bytes
    fileStatus.expirationDate    // When the file will be deleted
  );
} else {
  console.error("Failed to fetch file status:", fileStatus.error);
}

// Remove a specific file from the queue
const file1 = new File(["content 1"], "report1.pdf", { type: "application/pdf" });
const file2 = new File(["content 2"], "report2.pdf", { type: "application/pdf" });

const upload1 = await proxy.volatileKnowledge.upload(file1);
const upload2 = await proxy.volatileKnowledge.upload(file2);

if (upload1.success && upload2.success) {
  // Remove only the first file
  proxy.volatileKnowledge.removeById(upload1.id);
  
  // Now only file2 will be included in the next execution
  const response = await proxy.execute();
  console.log(response.content);
}

// Clear all files from the queue
await proxy.volatileKnowledge.upload(file1);
await proxy.volatileKnowledge.upload(file2);

// Clear all pending files
proxy.volatileKnowledge.clear();

// No files will be included in this execution
const response = await proxy.execute();
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

## Upload Files (volatile knowledge)

Upload files to be used as context in your chat completion execution. Files are automatically included in the next execution.

```tsx
import SerenityClient from '@serenity-star/sdk';

const client = new SerenityClient({
  apiKey: '<SERENITY_API_KEY>',
});

// Create chat completion instance
const chatCompletion = client.agents.chatCompletions.create("document-assistant", {
  message: "Summarize this document"
});

// Upload a file
const file = new File(["content"], "document.pdf", { type: "application/pdf" });
const uploadResult = await chatCompletion.volatileKnowledge.upload(file);

// Check if upload was successful
if (uploadResult.success) {
  console.log(
    uploadResult.id,              // File ID
    uploadResult.fileName,         // "document.pdf"
    uploadResult.fileSize,         // Size in bytes
    uploadResult.expirationDate,   // When the file will be deleted
    uploadResult.status            // "analyzing", "invalid", "success", "error", or "expired"
  );
  
  // Execute the chat completion - the uploaded file will be automatically included
  const response = await chatCompletion.execute();
  console.log(response.content); // Summary based on the uploaded file
} else {
  // Handle upload errors
  console.error("Upload failed:", uploadResult.error);
}

// Upload with options
const imageFile = new File(["image data"], "screenshot.png", { type: "image/png" });
const uploadWithOptions = await chatCompletion.volatileKnowledge.upload(imageFile, {
  useVision: true,              // Enable vision for image files (automatically skips embeddings for images)
  noExpiration: false,          // File will expire (default behavior)
  expirationDays: 7,           // Custom expiration in days
  locale: {
    uploadFileErrorMessage: "Failed to upload file. Please try again." // You can optionally provide localized error messages
  }
});

if (uploadWithOptions.success) {
  // The file is now ready to be used in the execution
  const response = await chatCompletion.execute();
  console.log(response.content);
}

// Check file status by ID
const fileStatus = await chatCompletion.volatileKnowledge.getById(uploadResult.id);

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

const upload1 = await chatCompletion.volatileKnowledge.upload(file1);
const upload2 = await chatCompletion.volatileKnowledge.upload(file2);

if (upload1.success && upload2.success) {
  // Remove only the first file
  chatCompletion.volatileKnowledge.removeById(upload1.id);
  
  // Now only file2 will be included in the next execution
  const response = await chatCompletion.execute();
  console.log(response.content);
}

// Clear all files from the queue
await chatCompletion.volatileKnowledge.upload(file1);
await chatCompletion.volatileKnowledge.upload(file2);

// Clear all pending files
chatCompletion.volatileKnowledge.clear();

// No files will be included in this execution
const response = await chatCompletion.execute();
```