import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { dotSpans } from "./vite-dots.js";

// The app is built into dist/, which the server serves (WEB_DIR). Files in public/ (icons, fonts, pdf.js, the service worker) are copied as they are.
// In dev, the server forwards every page and file to this dev server (see VITE_DEV_URL in docker-compose.dev.yml), so hot reload works on https://money.local.
export default defineConfig({
  base: "/",
  plugins: [vue({ template: { compilerOptions: { nodeTransforms: [dotSpans] } } })],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5173, strictPort: true, allowedHosts: true, hmr: { clientPort: 443, protocol: "wss" } },
});
