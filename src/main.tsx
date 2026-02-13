import React from "react";
import ReactDOM from "react-dom/client";
import "./bootstrapEnv";
import App from "./app/App";
import { MockEngineProvider } from "./app/providers/MockEngineProvider";
import { WalletProvider } from "./app/providers/WalletProvider";
import { sendE2EDebugEvent } from "./shared/lib/e2eIngest";
import "./styles/index.css";

const root = document.getElementById("root");
const isMockMode = import.meta.env.VITE_LENDING_MODE === "mock";

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", "blue");
}

if (typeof document !== "undefined") {
  const unblockUserInteraction = (event: Event) => {
    event.stopPropagation();
  };
  document.addEventListener("contextmenu", unblockUserInteraction, { capture: true });
  document.addEventListener("selectstart", unblockUserInteraction, { capture: true });
}

sendE2EDebugEvent({
  runId: "e2e-debug-1",
  hypothesisId: "H1",
  location: "src/main.tsx:9",
  message: "Boot env evaluated",
  data: { viteLendingMode: import.meta.env.VITE_LENDING_MODE, isMockMode },
  timestamp: Date.now(),
});

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <WalletProvider mockMode={isMockMode}>
      <MockEngineProvider>
        <App />
      </MockEngineProvider>
    </WalletProvider>
  </React.StrictMode>
);
