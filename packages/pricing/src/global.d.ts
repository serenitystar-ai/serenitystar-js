declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  // Add other VITE_ vars here as needed...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}