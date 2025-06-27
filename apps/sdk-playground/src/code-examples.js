export const codeExamples = {
  realtime: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const session = client.agents.assistants
  .createRealtimeSession("realtime-cooking")
  .on("session.created", () => {
    console.log("Session started");
  })
  .on("speech.started", () => {
    console.log("User started talking");
  })
  .on("speech.stopped", () => {
    console.log("User stopped talking");
  });

await session.start();`,

  conversationSse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const conversation = await client.agents.assistants
  .createConversation("translator-assistant")

conversation
  .on("start", () => {
    console.log("Starting translation...");
  })
  .on("content", (chunk) => {
    console.log("Translated chunk:", chunk);
  });

await conversation.streamMessage(
  "El sol comenzaba a esconderse detrás de las montañas..."
);`,

  conversationNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const conversation = await client.agents.assistants
  .createConversation("translator-assistant");

const response = await conversation.sendMessage(
  "El sol comenzaba a esconderse..."
);

console.log("Translation:", response.content);`,

  activitySse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const activity = client.agents.activities
  .create("text-summarizer", {
    inputParameters: {
      "text_to_summarize": textToSummarize,
    }
  })
  .on("start", () => {
    console.log("Starting summarization...")
  })
  .on("content", (chunk) => {
    console.log("Summary chunk:", chunk)
  });

await activity.stream();`,

  activityNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const response = await client.agents.activities
  .execute("text-summarizer", {
    inputParameters: {
      "text_to_summarize": textToSummarize
    }
  });

console.log("Summary:", response.content);`,

  cookingSse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const activity = client.agents.activities
  .create("cooking-activity", {
    inputParameters: {
      ingredientOne: "chicken",
      ingredientTwo: "onion",
      ingredientThree: "cream",
    }
  })
  .on("content", (chunk) => {
    console.log("Recipe chunk:", chunk)
  });

await activity.stream();`,

  cookingNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const response = await client.agents.activities
  .execute("cooking-activity", {
    inputParameters: {
      ingredientOne: "chicken",
      ingredientTwo: "onion",
      ingredientThree: "cream",
    }
  });

console.log("Recipe:", response.content);`,

  chatSse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const chatCompletion = client.agents.chatCompletions
  .create("cooking-chat", {
    message: "How do I cook a parmesan chicken?"
  })
  .on("content", (chunk) => {
    console.log("Response chunk:", chunk)
  });

await chatCompletion.stream();`,

  chatNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const response = await client.agents.chatCompletions
  .execute("cooking-chat", {
    message: "How do I cook a parmesan chicken?"
  });

console.log("Response:", response.content);`,

  proxySse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const proxy = client.agents.proxies
  .create("proxy-agent", {
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      { role: "user", content: "What is artificial intelligence?" }
    ],
    temperature: 1,
    max_tokens: 250,
  })
  .on("content", (chunk) => {
    console.log("Response chunk:", chunk)
  });

await proxy.stream();`,

  proxyNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const response = await client.agents.proxies
  .execute("proxy-agent", {
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      { role: "user", content: "What is artificial intelligence?" }
    ],
    temperature: 1,
    max_tokens: 250,
  });

console.log("Response:", response.content);`,

  planSse: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const plan = client.agents.plans
  .create("event-planner")
  .on("content", (chunk) => {
    console.log("Plan chunk:", chunk)
  });

await plan.stream();`,

  planNormal: `import { SerenityClient } from "@serenity-star/sdk"

const client = new SerenityClient({
  apiKey: &lt;YOUR_SERENITY_API_KEY&gt;
});

const response = await client.agents.plans
  .execute("event-planner");

console.log("Plan:", response.content);`
};
