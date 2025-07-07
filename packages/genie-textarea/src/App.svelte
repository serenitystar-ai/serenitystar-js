<script lang="ts">
  import GenieTextarea from "./web-component/GenieTextarea.svelte";
  const apiKey = import.meta.env.VITE_API_KEY;
  const agentCode = import.meta.env.VITE_AGENT_CODE;
</script>

<main>
  <div class="genie-textarea-root">
    <div class="p-8 bg-white w-1/2">

      <GenieTextarea
        label="Text"
        mode="assisted"
        locale={{
          assistedMode: {
            inputPlaceholder: "Ingresa una instruccion..."
          }
        }}
        handleAgentResult={async (result) => {
          console.log("Agent result:", result);
        }}
        {apiKey}
        {agentCode}
        contentParameterName="userMessage"
        instructionParameterName="instruction"
        aiButtonProps={{
          text: "Run",
        }}
        
        value="¡Bienvenido a la documentación de Serenity AI Hub! Aquí encontrarás información detallada sobre nuestros productos, funciones y más."
      />
    </div>
  </div>
</main>
