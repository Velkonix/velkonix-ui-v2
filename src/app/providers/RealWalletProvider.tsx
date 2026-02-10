import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useAccount, useConnect, useDisconnect, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

import type { WalletAddress } from "../../shared/lib/wallet";
import { WalletContext, createWalletContextValue } from "./walletContext";

const WALLETCONNECT_PROJECT_ID = "demo";
const walletQueryClient = new QueryClient();
const wagmiConfig = getDefaultConfig({
  appName: "Velkonix UI",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, sepolia],
  ssr: false,
});

function RealWalletContextProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const connect = useCallback(async () => {
    const connector = connectors.find((item) => item.type === "injected" && item.ready) ?? connectors[0];
    if (!connector) {
      throw new Error("No wallet connector available");
    }
    await connectAsync({ connector });
  }, [connectAsync, connectors]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const normalizedAddress = (address as WalletAddress | undefined) ?? null;

  const value = useMemo(
    () => createWalletContextValue("real", normalizedAddress, isPending, connect, disconnect),
    [connect, disconnect, isPending, normalizedAddress]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function RealWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={walletQueryClient}>
        <RainbowKitProvider>
          <RealWalletContextProvider>{children}</RealWalletContextProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
