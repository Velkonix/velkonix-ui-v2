import { createPublicClient, createWalletClient, custom, http } from "viem";
import type { PublicClient, WalletClient } from "viem";

import { PREVIEW_NETWORK_CONFIG } from "../../config/networks";
import type { Address } from "../../domain/types";

export const previewChain = PREVIEW_NETWORK_CONFIG.viemChain;

export const previewPublicClient: PublicClient = createPublicClient({
  chain: previewChain,
  transport: http(PREVIEW_NETWORK_CONFIG.rpcUrl),
});

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const getInjectedProvider = (): InjectedProvider => {
  const injected =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum?: InjectedProvider }).ethereum
      : undefined;
  if (!injected) {
    throw new Error(
      "No browser wallet detected. Open this page with an injected wallet (e.g. MetaMask) on Arbitrum Sepolia."
    );
  }
  return injected;
};

export const getPreviewWalletClient = (account: Address): WalletClient =>
  createWalletClient({
    account,
    chain: previewChain,
    transport: custom(getInjectedProvider()),
  });
