import { SerenityClient } from "@serenity-star/sdk";
import { setupDynamicHandler } from "./utils";

const client = new SerenityClient({
  apiKey: import.meta.env.VITE_SERENITY_API_KEY,
  baseUrl: import.meta.env.VITE_SERENITY_BASE_URL,
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
  })
  .on("response.done", () => {
    console.log("Response received", response);
  })
  .on("session.stopped", () => {
    console.log("Session stopped");
  })
  .on("error", (error) => {
    console.error("Error:", error);
  });

setupDynamicHandler("start-session", async () => {
  try {
    await session.start();
  } catch (error) {
    console.error("Error starting session:", error);
  }
});

setupDynamicHandler("stop-session", () => {
  try {
    session.stop();
  } catch (error) {
    console.error("Error stopping session:", error);
  }
});
