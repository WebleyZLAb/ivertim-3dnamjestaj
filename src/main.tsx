import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import "./desktop.css";
import { DesktopProvider } from "./desktop";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesktopProvider><App /></DesktopProvider>
  </StrictMode>,
);
