/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NETWORK?: string;
  readonly VITE_LENDING_MODE?: "mock" | "aave";
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_ARBITRUM_SEPOLIA_RPC_URL?: string;
  readonly VITE_E2E_INGEST_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.css" {
  const classes: Record<string, string>;
  export default classes;
}
