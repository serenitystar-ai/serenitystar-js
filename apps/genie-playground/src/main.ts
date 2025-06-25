import { defineElement, genieTextarea } from '@serenity-star/genie-textarea'

const apiKey = import.meta.env.VITE_API_KEY;
const agentCode = import.meta.env.VITE_AGENT_CODE;

defineElement('genie-textarea')

// Basic example for an agent that translates text to english
const instance = genieTextarea("my-genie-textarea", {
    agentCode,
    apiKey,
    placeholder: "Type the message you want to translate to english",
    contentParameterName: "userMessage",
    label: "Message",
    value: "¡Bienvenido a la documentación de Serenity AI Hub! Aquí encontrarás información detallada sobre nuestros productos, funciones y más."
})

// Programmatically interact with the genie-textarea component
document.getElementById('update-btn')?.addEventListener('click', () => {
    instance.set("value", "Bienvenido a Genie Textarea!")
    instance.aiButton.execute();
})
