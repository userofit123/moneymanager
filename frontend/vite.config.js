import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The new Vue app lives at /app/ next to the old page. It is built into ../web/app, which the server already serves.
// In dev, the server forwards /app/ to this dev server (see VITE_DEV_URL in docker-compose.dev.yml), so hot reload works on https://money.local.
export default defineConfig({
  base: "/app/",
  plugins: [vue()],
  build: { outDir: "../web/app", emptyOutDir: true },
  server: { port: 5173, strictPort: true, allowedHosts: true, hmr: { clientPort: 443, protocol: "wss" } },
});
