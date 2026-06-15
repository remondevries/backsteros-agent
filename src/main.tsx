import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter/index.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "@xterm/xterm/css/xterm.css";
import App from "./App.tsx";
import { initIosStandaloneLayout } from "./platform/iosStandalone.ts";
import "./theme.css";
import "./index.css";
import "./editor/editor.css";
import "./markdown/markdown.css";

initIosStandaloneLayout();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
