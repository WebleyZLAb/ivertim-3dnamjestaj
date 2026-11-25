import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleSaveElementRequest } from "./scripts/library-save.mjs";

/** Razvojni server: isti upis elementa u biblioteku kao u pokretaču (scripts/serve-corpus.mjs). */
function librarySave(): Plugin {
  return {
    name: "ivertim-library-save",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        handleSaveElementRequest(request, response, process.cwd()).then((handled) => { if (!handled) next(); }, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), librarySave()],
  server: {
    host: "127.0.0.1",
    port: 4317,
  },
});
