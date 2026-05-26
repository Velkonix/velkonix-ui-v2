import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ensureMockUser, getPersistedMockUser } from "../../mock";
import { createRandomMockAddress, type WalletAddress } from "../../shared/lib/wallet";
import { WalletContext, createWalletContextValue, useWallet } from "./walletContext";

type WalletProviderProps = {
  children: ReactNode;
  mockMode: boolean;
};

const LazyRealWalletProvider = lazy(async () =>
  import("./RealWalletProvider").then((module) => ({ default: module.RealWalletProvider }))
);

const disconnectedRealWallet = createWalletContextValue(
  "real",
  null,
  false,
  null,
  null,
  false,
  null,
  null,
  async () => {},
  async () => {},
  async () => {}
);

function MockWalletStateProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [persistedAddress, setPersistedAddress] = useState<WalletAddress | null>(() => {
    return (getPersistedMockUser() as WalletAddress | null) ?? null;
  });
  const [isSessionConnected, setIsSessionConnected] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    const nextAddress = persistedAddress ?? createRandomMockAddress();
    ensureMockUser(nextAddress);
    setPersistedAddress(nextAddress);
    setIsSessionConnected(true);
    setIsConnecting(false);
  }, [persistedAddress]);

  const disconnect = useCallback(async () => {
    setIsSessionConnected(false);
  }, []);

  const activeAddress = isSessionConnected ? persistedAddress : null;

  const value = useMemo(
    () =>
      createWalletContextValue(
        "mock",
        activeAddress,
        isConnecting,
        null,
        null,
        false,
        null,
        null,
        connect,
        disconnect,
        async () => {}
      ),
    [activeAddress, connect, disconnect, isConnecting]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children, mockMode }: WalletProviderProps) {
  if (mockMode) {
    return <MockWalletStateProvider>{children}</MockWalletStateProvider>;
  }

  return (
    <Suspense
      fallback={
        <WalletContext.Provider value={disconnectedRealWallet}>{children}</WalletContext.Provider>
      }
    >
      <LazyRealWalletProvider>{children}</LazyRealWalletProvider>
    </Suspense>
  );
}
export { useWallet };
