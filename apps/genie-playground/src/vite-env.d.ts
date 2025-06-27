/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_AGENT_CODE: string
  // Add other VITE_ vars here as needed...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}