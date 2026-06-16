import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import {
  WagmiProvider,
  http,
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";

import { getActiveNetworkConfig } from "../../config/networks";
import type { WalletAddress } from "../../shared/lib/wallet";
import { WalletContext, createWalletContextValue } from "./walletContext";

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo";
const walletQueryClient = new QueryClient();
const activeNetwork = getActiveNetworkConfig();
const ACTIVE_CHAIN = activeNetwork.viemChain;

const RPC_OVERRIDE_BY_NETWORK: Record<string, string | undefined> = {
  "megaeth-mainnet": import.meta.env.VITE_MEGAETH_RPC_URL?.trim() || undefined,
  "arbitrum-sepolia": import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL?.trim() || undefined,
};
const ACTIVE_RPC_URL =
  RPC_OVERRIDE_BY_NETWORK[activeNetwork.key] ||
  activeNetwork.rpcUrl ||
  ACTIVE_CHAIN.rpcUrls.default.http[0];

if (ACTIVE_CHAIN.id !== activeNetwork.chainId) {
  throw new Error(`Unsupported wallet chainId ${activeNetwork.chainId}.`);
}

const wagmiConfig = getDefaultConfig({
  appName: "Velkonix UI",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [ACTIVE_CHAIN],
  transports: {
    [ACTIVE_CHAIN.id]: http(ACTIVE_RPC_URL),
  },
  ssr: false,
});

function RealWalletContextProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const publicClient = usePublicClient({ chainId: activeNetwork.chainId });
  const { data: walletClient } = useWalletClient({ chainId: activeNetwork.chainId });
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  const connect = useCallback(async () => {
    if (!openConnectModal) {
      throw new Error("Connect modal is unavailable");
    }
    openConnectModal();
  }, [openConnectModal]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const switchNetwork = useCallback(async () => {
    await switchChainAsync({ chainId: activeNetwork.chainId });
  }, [switchChainAsync]);

  const normalizedAddress = (address as WalletAddress | undefined) ?? null;
  const normalizedChainId = typeof chainId === "number" ? chainId : null;
  const isWrongNetwork = normalizedAddress !== null && normalizedChainId !== activeNetwork.chainId;

  const value = useMemo(
    () =>
      createWalletContextValue(
        normalizedAddress,
        isPending || connectModalOpen,
        normalizedChainId,
        activeNetwork.chainId,
        isWrongNetwork,
        publicClient ?? null,
        walletClient ?? null,
        connect,
        disconnect,
        switchNetwork,
        openAccountModal ?? undefined
      ),
    [
      connect,
      disconnect,
      connectModalOpen,
      isPending,
      normalizedAddress,
      normalizedChainId,
      isWrongNetwork,
      publicClient,
      walletClient,
      switchNetwork,
      openAccountModal,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function RealWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={walletQueryClient}>
        <RainbowKitProvider locale="en-US">
          <RealWalletContextProvider>{children}</RealWalletContextProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
