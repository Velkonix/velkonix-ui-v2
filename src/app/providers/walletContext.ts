import { createContext, useContext } from "react";
import type { PublicClient, WalletClient } from "viem";

import { formatWalletAddress, type WalletAddress } from "../../shared/lib/wallet";

export type WalletContextValue = {
  address: WalletAddress | null;
  shortAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  expectedChainId: number | null;
  isWrongNetwork: boolean;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  openAccountModal?: () => void;
};

export const createWalletContextValue = (
  address: WalletAddress | null,
  isConnecting: boolean,
  chainId: number | null,
  expectedChainId: number | null,
  isWrongNetwork: boolean,
  publicClient: PublicClient | null,
  walletClient: WalletClient | null,
  connect: () => Promise<void>,
  disconnect: () => Promise<void>,
  switchNetwork: () => Promise<void>,
  openAccountModal?: () => void
): WalletContextValue => ({
  address,
  shortAddress: formatWalletAddress(address),
  isConnected: address !== null,
  isConnecting,
  chainId,
  expectedChainId,
  isWrongNetwork,
  publicClient,
  walletClient,
  connect,
  disconnect,
  switchNetwork,
  openAccountModal,
});

export const WalletContext = createContext<WalletContextValue | null>(null);

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
