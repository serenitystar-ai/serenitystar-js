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
      });

    await conversation.streamMessage("El sol comenzaba a esconderse detrás de las montañas, tiñendo el cielo de tonos anaranjados y rosados. El viento fresco movía suavemente las hojas de los árboles, mientras el sonido de un río cercano añadía un toque de tranquilidad al paisaje. En el pueblo, las luces de las farolas comenzaban a encenderse, y el aroma a pan recién horneado salía de una pequeña panadería en la esquina de la plaza. Era un momento perfecto para sentarse en un banco, respirar profundamente y simplemente disfrutar del instante.");
  } catch (error) {
    console.error("Error:", error);
  }
});
