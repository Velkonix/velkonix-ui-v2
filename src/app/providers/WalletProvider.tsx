import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

import { WalletContext, createWalletContextValue, useWallet } from "./walletContext";

type WalletProviderProps = {
  children: ReactNode;
};

const LazyRealWalletProvider = lazy(async () =>
  import("./RealWalletProvider").then((module) => ({ default: module.RealWalletProvider }))
);

const disconnectedRealWallet = createWalletContextValue(
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

export function WalletProvider({ children }: WalletProviderProps) {
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
