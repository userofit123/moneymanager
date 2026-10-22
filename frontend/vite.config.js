import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync, writeFileSync } from "node:fs";
import { dotSpans } from "./vite-dots.js";

// Files of their own, so a phone downloads less at start and keeps them across updates that do not change them:
// Vue and vue-i18n, the English texts (always loaded), the Hebrew texts (only when the language is Hebrew)
// and the page guide in each language with its little pictures (only when the guide opens).
function chunkOf(id) {
  if (/[\\/]node_modules[\\/](@vue|vue|vue-i18n|@intlify)[\\/]/.test(id)) return "vue";
  const m = /[\\/]src[\\/](locales|help)[\\/](?:(?:pages|settings)[\\/][\w-]+\.)?(en|he|demo)\.js(on)?$/.exec(id);
  if (m) return m[1] === "locales" ? "texts-" + m[2] : m[2] === "demo" ? "guide-pictures" : "guide-" + m[2];
}

// The files the app loads only later (the other language, the guide, the windows), with the files they need, are listed in
// the service worker, which keeps them when it installs, so they work offline after the first visit even when they were not
// used yet. The list changes with every build that changes them, so the browser then installs the new service worker.
const LATER = /^(texts-he|guide-)|^(AppearancePanel|SyncSheet|WelcomePops|Suggestions|TxWindow|TxPops|DocViewer|AssistWindow)$/;
function offlineList() {
  let files = [];
  return {
    name: "offline-list",
    apply: "build",
    generateBundle(_, bundle) {
      const add = (c, out) => { if (!c || out.has(c.fileName)) return; out.add(c.fileName); (c.viteMetadata?.importedCss || []).forEach((f) => out.add(f)); c.imports.forEach((f) => add(bundle[f], out)); };
      const out = new Set();
      Object.values(bundle).filter((c) => c.type === "chunk" && LATER.test(c.name)).forEach((c) => add(c, out));
      files = [...out];
    },
    writeBundle(o) {
      const sw = o.dir + "/sw.js", src = readFileSync(sw, "utf8");
      writeFileSync(sw, src.replace(/const LATER = \[\];/, "const LATER = " + JSON.stringify(files.sort().map((f) => "/" + f)) + ";"));
    },
  };
}

// The app is built into dist/, which the server serves (WEB_DIR). Files in public/ (icons, fonts, pdf.js, the service worker) are copied as they are.
// In dev, the server forwards every page and file to this dev server (see VITE_DEV_URL in docker-compose.dev.yml), so hot reload works on https://money.local.
export default defineConfig({
  base: "/",
  plugins: [vue({ template: { compilerOptions: { nodeTransforms: [dotSpans] } } }), offlineList()],
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { output: { manualChunks: chunkOf } } },
  // In the dev container the folder is shared from the host, where file-change events do not always arrive: VITE_POLL turns on checking for changes.
  server: { port: 5173, strictPort: true, allowedHosts: true, hmr: { clientPort: 443, protocol: "wss" }, watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined },
});
