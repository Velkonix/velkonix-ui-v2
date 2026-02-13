const E2E_INGEST_URL = "http://127.0.0.1:7242/ingest/79658062-1f9f-451c-9869-7f640578985d";

type E2EDebugEvent = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: unknown;
  timestamp: number;
};

const isE2EIngestEnabled = import.meta.env.VITE_E2E_INGEST_ENABLED === "true";

export function sendE2EDebugEvent(event: E2EDebugEvent): void {
  if (!isE2EIngestEnabled || typeof fetch !== "function") {
    return;
  }

  void fetch(E2E_INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}
