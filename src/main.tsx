import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { MockEngineProvider } from "./app/providers/MockEngineProvider";
import { WalletProvider } from "./app/providers/WalletProvider";
import "./styles/index.css";

const SUPPORTED_THEMES = ["amber", "experimental-1"] as const;
type ThemeName = (typeof SUPPORTED_THEMES)[number];

function resolveThemeName(value: string | undefined): ThemeName {
  return SUPPORTED_THEMES.includes(value as ThemeName) ? (value as ThemeName) : "amber";
}

const root = document.getElementById("root");
const forceMockFromQuery =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mock") === "1";
const isMockMode = import.meta.env.VITE_MOCK_MODE === "true" || forceMockFromQuery;
const activeTheme = resolveThemeName(import.meta.env.VITE_THEME);

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", activeTheme);
}

if (typeof document !== "undefined") {
  const unblockUserInteraction = (event: Event) => {
    event.stopPropagation();
  };
  document.addEventListener("contextmenu", unblockUserInteraction, { capture: true });
  document.addEventListener("selectstart", unblockUserInteraction, { capture: true });
}

if (typeof fetch === "function") {
  fetch("http://127.0.0.1:7242/ingest/79658062-1f9f-451c-9869-7f640578985d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId: "e2e-debug-1",
      hypothesisId: "H1",
      location: "src/main.tsx:9",
      message: "Boot env evaluated",
      data: { viteMockMode: import.meta.env.VITE_MOCK_MODE, forceMockFromQuery, isMockMode },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <WalletProvider mockMode={isMockMode}>
      {isMockMode ? (
        <MockEngineProvider>
          <App mockMode />
        </MockEngineProvider>
      ) : (
        <App mockMode={false} />
      )}
    </WalletProvider>
  </React.StrictMode>
);
