import { createContext, useContext } from "react";

import { formatWalletAddress, type WalletAddress } from "../../shared/lib/wallet";

export type WalletMode = "mock" | "real";

export type WalletContextValue = {
  mode: WalletMode;
  address: WalletAddress | null;
  shortAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const createWalletContextValue = (
  mode: WalletMode,
  address: WalletAddress | null,
  isConnecting: boolean,
  connect: () => Promise<void>,
  disconnect: () => Promise<void>
): WalletContextValue => ({
  mode,
  address,
  shortAddress: formatWalletAddress(address),
  isConnected: address !== null,
  isConnecting,
  connect,
  disconnect,
});

export const WalletContext = createContext<WalletContextValue | null>(null);

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
