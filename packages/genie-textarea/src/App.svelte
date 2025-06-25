<script lang="ts">
  import GenieTextarea from "./web-component/GenieTextarea.svelte";
  const apiKey = import.meta.env.VITE_API_KEY;
  const agentCode = import.meta.env.VITE_AGENT_CODE;
</script>

<main>
  <div class="genie-textarea-root">
    <div class="p-8 bg-white">
      <GenieTextarea
        label="Text to translate"
        handleAgentResult={async (result) => {
          console.log("Agent result:", result);
        }}
        {apiKey}
        {agentCode}
        contentParameterName="userMessage"
        aiButton={{
          text: "Run",
        }}
        value="¡Bienvenido a la documentación de Serenity AI Hub! Aquí encontrarás información detallada sobre nuestros productos, funciones y más."
      />
    </div>
  </div>
</main>
