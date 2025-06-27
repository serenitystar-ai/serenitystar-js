import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import terser from "@rollup/plugin-terser";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true,
      },
    })
  ],
  build: {
    lib: {
      entry: {
        "genie-textarea": "./src/script.ts" // Entry point for IIFE
      },
      name: "GenieTextarea",
      formats: ["iife"],
      fileName: "genie-textarea",
      cssFileName: "genie-textarea"
    },
    emptyOutDir: false,
    sourcemap: false,
    cssMinify: false,
    rollupOptions: {
      plugins: [
        terser({
          format: {
            comments: false,
            beautify: false,
          },
          compress: {
            passes: 3,
            drop_console: true,
            drop_debugger: true,
          },
          mangle: true,
        }),
      ],
    },
  },
});
