import { SerenityClient } from "@serenity-star/sdk";
import { setupDynamicHandler } from "./utils";

const client = new SerenityClient({
  apiKey: import.meta.env.VITE_SERENITY_API_KEY,
  baseUrl: import.meta.env.VITE_SERENITY_BASE_URL
});

// Demo without SSE
setupDynamicHandler("start-normal", async () => {
  try {
    const conversation = await client.agents.assistants
      .createConversation("translator-assistant");

    const response = await conversation.sendMessage("El sol comenzaba a esconderse...");
    console.log("Response:", response);
    document.getElementById("normal-response").textContent = response.content;
  } catch (error) {
    console.error("Error:", error);
  }
});

// Demo with SSE
setupDynamicHandler("start-sse", async () => {
  try {
    const responseElement = document.getElementById("sse-response");
    const conversation = await client.agents.assistants
      .createConversation("translator-assistant")

    conversation
      .on("start", () => {
        responseElement.textContent = "";
      })
      .on("content", (chunk) => {
        responseElement.textContent += chunk;
      })
      .on("error", (error) => {
        console.error("Error:", error);
      })
      .on("stop", (result) => {
        console.log("Conversation ended:", result);
      });

    await conversation.streamMessage("El sol comenzaba a esconderse detrás de las montañas, tiñendo el cielo de tonos anaranjados y rosados. El viento fresco movía suavemente las hojas de los árboles, mientras el sonido de un río cercano añadía un toque de tranquilidad al paisaje. En el pueblo, las luces de las farolas comenzaban a encenderse, y el aroma a pan recién horneado salía de una pequeña panadería en la esquina de la plaza. Era un momento perfecto para sentarse en un banco, respirar profundamente y simplemente disfrutar del instante.");
  } catch (error) {
    console.error("Error:", error);
  }
});

// Demo for getting basic agent info
setupDynamicHandler("start-basic-info", async () => {
  try {
    const agentInfo = await client.agents.assistants.getInfoByCode("chef-assistant", {
      channel: "ChatComponent"
    });
    
    console.log("Agent Info:", agentInfo);
    const responseElement = document.getElementById("basic-info-response");
    responseElement.innerHTML = `
      <div style="white-space: pre-wrap; font-family: monospace;">
        <strong>Initial Message:</strong> ${agentInfo.conversation.initialMessage}
        <strong>Conversation Starters:</strong> ${JSON.stringify(agentInfo.conversation.starters, null, 2)}
        <strong>Agent Version:</strong> ${agentInfo.agent.version}
        <strong>Vision Enabled:</strong> ${agentInfo.agent.visionEnabled}
        <strong>Realtime Enabled:</strong> ${agentInfo.agent.isRealtime}
        <strong>Image ID:</strong> ${agentInfo.agent.imageId}
        ${agentInfo.channel ? `<strong>Channel Data:</strong> ${JSON.stringify(agentInfo.channel, null, 2)}` : ''}
      </div>
    `;
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("basic-info-response").textContent = `Error: ${error.message}`;
  }
});

// Demo for getting advanced agent info with parameters
setupDynamicHandler("start-advanced-info", async () => {
  try {
    const agentInfo = await client.agents.assistants.getInfoByCode("chef-assistant", {
      agentVersion: 2,
      channel: "ChatComponent",
      inputParameters: {
        dietaryRestrictions: "vegetarian",
        cuisinePreference: "italian",
        skillLevel: "beginner"
      },
      userIdentifier: "user-123"
    });
    
    console.log("Advanced Agent Info:", agentInfo);
    const responseElement = document.getElementById("advanced-info-response");
    responseElement.innerHTML = `
      <div style="white-space: pre-wrap; font-family: monospace;">
        <strong>Personalized Initial Message:</strong> ${agentInfo.conversation.initialMessage}
        <strong>Custom Conversation Starters:</strong> ${JSON.stringify(agentInfo.conversation.starters, null, 2)}
        <strong>Agent Version:</strong> ${agentInfo.agent.version}
        <strong>Vision Enabled:</strong> ${agentInfo.agent.visionEnabled}
        <strong>Realtime Enabled:</strong> ${agentInfo.agent.isRealtime}
        <strong>Image ID:</strong> ${agentInfo.agent.imageId}
        ${agentInfo.channel ? `<strong>Channel Data:</strong> ${JSON.stringify(agentInfo.channel, null, 2)}` : ''}
      </div>
    `;
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("advanced-info-response").textContent = `Error: ${error.message}`;
  }
});
