import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import terser from "@rollup/plugin-terser";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true,
      },
    }),
    dts({
      outDir: "dist",
      include: ["./src/index.ts", "./src/global.d.ts", "./src/GenieTextarea.ts", "./src/types.ts"],
      copyDtsFiles: true,
      tsconfigPath: './tsconfig.app.json',
      rollupTypes: true, // This will bundle all .d.ts files into a single file
    }),
  ],
  build: {
    lib: {
      entry: {
        index: "./src/index.ts", // Main entry point for ESM
      },
      name: "GenieTextarea",
      formats: ["es"],
      fileName: "index",
      cssFileName: "index"
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
