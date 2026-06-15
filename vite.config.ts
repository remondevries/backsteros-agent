import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolveBuildSha } from "./scripts/resolve-build-sha.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const stubsDir = path.resolve(rootDir, "src/platform/stubs");

/** True when Vite is invoked by the Tauri CLI (dev or production desktop build). */
function isTauriViteBuild(): boolean {
  return Boolean(process.env.TAURI_ENV_PLATFORM ?? process.env.TAURI_PLATFORM);
}

function tauriStubAliases(): Record<string, string> {
  return {
    "@tauri-apps/api/core": path.join(stubsDir, "tauri-core.ts"),
    "@tauri-apps/api/event": path.join(stubsDir, "tauri-event.ts"),
    "@tauri-apps/api/window": path.join(stubsDir, "tauri-window.ts"),
    "@tauri-apps/api/path": path.join(stubsDir, "tauri-path.ts"),
    "@tauri-apps/plugin-dialog": path.join(stubsDir, "tauri-dialog.ts"),
    "@tauri-apps/plugin-shell": path.join(stubsDir, "tauri-shell.ts"),
  };
}

let loggedSidecarProxyDown = false;

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
      if (!loggedSidecarProxyDown) {
        loggedSidecarProxyDown = true;
        console.error("[vite] Sidecar not running on 3847 — run npm run dev");
      }
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
  define: {
    "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(
      process.env.VITE_APP_BUILD_SHA?.trim() || resolveBuildSha(),
    ),
  },
  resolve: {
    alias: isTauriViteBuild() ? {} : tauriStubAliases(),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-markdown") || id.includes("remark-gfm") || id.includes("micromark")) {
            return "markdown";
          }
          if (id.includes("react-dom") || id.includes("/react/")) {
            return "react";
          }
          if (id.includes("@tauri-apps")) {
            return "tauri";
          }
          if (id.includes("pdfjs-dist") || id.includes("react-pdf")) {
            return "pdf";
          }
        },
      },
    },
  },
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
      "/linear/oauth/callback": {
        target: "http://127.0.0.1:3847",
        changeOrigin: true,
        configure: configureSidecarProxy,
      },
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
});
