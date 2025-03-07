import { SerenityClient } from "@serenity-star/sdk";
import dotenv from 'dotenv';

dotenv.config();

const client = new SerenityClient({
  apiKey: process.env.SERENITY_API_KEY,
  baseUrl: process.env.SERENITY_BASE_URL
});

const spanishText = "El sol comenzaba a esconderse detrás de las montañas, tiñendo el cielo de tonos anaranjados y rosados. El viento fresco movía suavemente las hojas de los árboles, mientras el sonido de un río cercano añadía un toque de tranquilidad al paisaje. En el pueblo, las luces de las farolas comenzaban a encenderse, y el aroma a pan recién horneado salía de una pequeña panadería en la esquina de la plaza. Era un momento perfecto para sentarse en un banco, respirar profundamente y simplemente disfrutar del instante.";

const curryBioToSummarize = "Wardell Stephen Curry II (/ˈstɛfən/ STEF-ən;[1] born March 14, 1988) is an American professional basketball player and point guard for the Golden State Warriors of the National Basketball Association (NBA). Widely considered the greatest shooter of all time,[2][3] Curry is credited with revolutionizing the sport by inspiring teams and players at all levels to more prominently utilize the three-point shot.[4][5][6][7] He is a four-time NBA champion, a two-time NBA Most Valuable Player (MVP), an NBA Finals MVP, and a two-time NBA All-Star Game MVP. He is also a two-time NBA scoring champion, an eleven-time NBA All-Star, and a ten-time All-NBA Team selection (including four on the First Team). Internationally, he has won two gold medals at the FIBA World Cup and a gold medal at the 2024 Summer Olympics as part of the U.S. national team.";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Assistant Translator Demos
// Demonstrates translation capabilities using the assistant agent
async function demonstrateTranslatorAssistant() {
  try {
    console.log("\n=== Starting Translator Assistant Demo ===\n");
    const conversation = await client.agents.assistants
      .createConversation("translator-assistant");
    
    const response = await conversation.sendMessage(spanishText);
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateTranslatorAssistantWithStreaming() {
  try {
    console.log("\n=== Starting Translator Assistant Streaming Demo ===\n");
    const conversation = await client.agents.assistants
      .createConversation("translator-assistant");

    conversation
      .on("start", () => {
        console.log("Assistant started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await conversation.streamMessage(spanishText);
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Text Summarizer Activity Demos
// Demonstrates text summarization using the activity agent
async function demonstrateTextSummarizerActivity() {
  try {
    console.log("\n=== Starting Text Summarizer Activity Demo ===\n");
    const response = await client.agents.activities.execute("text-summarizer", {
      inputParameters: {
        "text_to_summarize": curryBioToSummarize
      }
    });
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateTextSummarizerActivityWithStreaming() {
  try {
    console.log("\n=== Starting Text Summarizer Activity Streaming Demo ===\n");
    const activity = client.agents.activities
      .create("text-summarizer", {
        inputParameters: {
          "text_to_summarize": curryBioToSummarize
        }
      });

    activity
      .on("start", () => {
        console.log("Activity started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await activity.stream();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Cooking Recipe Generation Demos
// Demonstrates recipe generation using different agent types
async function demonstrateCookingActivity() {
  try {
    console.log("\n=== Starting Cooking Recipe Activity Demo ===\n");
    const response = await client.agents.activities.execute("cooking-activity", {
      inputParameters: {
        ingredientOne: "chicken",
        ingredientTwo: "onion",
        ingredientThree: "cream"
      }
    });
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateCookingActivityWithStreaming() {
  try {
    console.log("\n=== Starting Cooking Activity Streaming Demo ===\n");
    const activity = client.agents.activities.create("cooking-activity", {
      inputParameters: {
        ingredientOne: "chicken",
        ingredientTwo: "onion",
        ingredientThree: "cream"
      }
    });

    activity
      .on("start", () => {
        console.log("Cooking Activity started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await activity.stream();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateCookingChatCompletion() {
  try {
    console.log("\n=== Starting Cooking Chat Completion Demo ===\n");
    const response = await client.agents.chatCompletions.execute(
      "cooking-chat",
      { message: "How do I cook a parmesan chicken?" }
    );
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateCookingChatCompletionWithStreaming() {
  try {
    console.log("\n=== Starting Cooking Chat Completion Streaming Demo ===\n");
    const chatCompletion = client.agents.chatCompletions.create(
      "cooking-chat",
      { message: "How do I cook a parmesan chicken?" }
    );

    chatCompletion
      .on("start", () => {
        console.log("Chat started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await chatCompletion.stream();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

// AI Model Proxy Demos
// Demonstrates direct interaction with AI models through proxy agent
async function demonstrateAIModelProxy() {
  try {
    console.log("\n=== Starting AI Model Proxy Demo ===\n");
    const response = await client.agents.proxies.execute("proxy-agent", {
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: "You are a helpful assistant. Always use short and concise responses" },
        { role: "user", content: "What is artificial intelligence?" }
      ],
      temperature: 1,
      max_tokens: 250
    });
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateAIModelProxyWithStreaming() {
  try {
    console.log("\n=== Starting AI Model Proxy Streaming Demo ===\n");
    const proxy = client.agents.proxies
      .create("proxy-agent", {
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "user", content: "What is artificial intelligence?" }
        ],
        temperature: 1,
        max_tokens: 250,
      });

    proxy
      .on("start", () => {
        console.log("Proxy started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await proxy.stream();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Event Planning Demos
// Demonstrates automated event planning capabilities
async function demonstrateEventPlanner() {
  try {
    console.log("\n=== Starting Event Planner Demo ===\n");
    const response = await client.agents.plans.execute("event-planner");
    console.log("Response:", response.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function demonstrateEventPlannerWithStreaming() {
  try {
    console.log("\n=== Starting Event Planner Streaming Demo ===\n");
    const plan = client.agents.plans.create("event-planner");

    plan
      .on("start", () => {
        console.log("Plan started...");
      })
      .on("content", (chunk) => {
        process.stdout.write(chunk);
      })
      .on("error", (error) => {
        console.error("Error:", error);
      });

    await plan.stream();
    console.log("\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Demo Runner
async function runAllDemonstrations() {
  const demos = [
    demonstrateTranslatorAssistant,
    demonstrateTranslatorAssistantWithStreaming,
    demonstrateTextSummarizerActivity,
    demonstrateTextSummarizerActivityWithStreaming,
    demonstrateCookingActivity,
    demonstrateCookingActivityWithStreaming,
    demonstrateCookingChatCompletion,
    demonstrateCookingChatCompletionWithStreaming,
    demonstrateAIModelProxy,
    demonstrateAIModelProxyWithStreaming,
    demonstrateEventPlanner,
    demonstrateEventPlannerWithStreaming
  ];

  for (const demo of demos) {
    console.clear();
    await demo();
    await delay(3000);
  }
}

console.log("Starting Serenity SDK Demonstrations...");
await runAllDemonstrations();
