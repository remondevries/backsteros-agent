import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function configureSidecarProxy(
  proxy: {
    on(
      event: "error",
      listener: (error: NodeJS.ErrnoException, req: IncomingMessage, res: ServerResponse | Socket) => void,
    ): void;
  },
) {
  proxy.on("error", (error, _req, res) => {
    if (error.code === "ECONNREFUSED") {
      if (res && "writeHead" in res && !res.headersSent) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Agent server is starting. Retry shortly." }));
      }
      return;
    }

    console.error("[vite] http proxy error:", error.message);
  });
}

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3847",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: configureSidecarProxy,
      },
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
});
