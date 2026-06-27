import { useCallback, useState } from "react";
import type { Address } from "viem";

import { useWallet } from "../../app/providers/WalletProvider";
import { getTokenSaleConfig } from "../../config/networks";
import {
  getPreviewWalletClient,
  previewChain,
  previewPublicClient,
} from "../../shared/lib/previewChain";
import { ERC20_ABI, SALE_ABI } from "./saleAbi";
import type { SaleAction } from "./types";

export function useSaleActions(refetchAll: () => Promise<void>) {
  const { address } = useWallet();
  const account = (address as Address | null) ?? null;

  const config = getTokenSaleConfig();
  const saleAddress = (config.saleContract || "") as Address | "";
  const usdcAddress = (config.usdc || "") as Address | "";

  const [pendingAction, setPendingAction] = useState<SaleAction | null>(null);

  const run = useCallback(
    async (action: SaleAction, send: () => Promise<`0x${string}`>) => {
      setPendingAction(action);
      try {
        const hash = await send();
        await previewPublicClient.waitForTransactionReceipt({ hash });
        await refetchAll();
        return hash;
      } finally {
        setPendingAction(null);
      }
    },
    [refetchAll]
  );

  const approve = useCallback(
    async (amount: bigint) => {
      if (!usdcAddress || !saleAddress || !account) return;
      const walletClient = getPreviewWalletClient(account);
      return run("approve", () =>
        walletClient.writeContract({
          account,
          chain: previewChain,
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [saleAddress, amount],
        })
      );
    },
    [usdcAddress, saleAddress, account, run]
  );

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!saleAddress || !account) return;
      const walletClient = getPreviewWalletClient(account);
      return run("deposit", () =>
        walletClient.writeContract({
          account,
          chain: previewChain,
          address: saleAddress,
          abi: SALE_ABI,
          functionName: "deposit",
          args: [amount],
        })
      );
    },
    [saleAddress, account, run]
  );

  const claimTokens = useCallback(async () => {
    if (!saleAddress || !account) return;
    const walletClient = getPreviewWalletClient(account);
    return run("claimTokens", () =>
      walletClient.writeContract({
        account,
        chain: previewChain,
        address: saleAddress,
        abi: SALE_ABI,
        functionName: "claimTokens",
      })
    );
  }, [saleAddress, account, run]);

  const claimRefund = useCallback(async () => {
    if (!saleAddress || !account) return;
    const walletClient = getPreviewWalletClient(account);
    return run("claimRefund", () =>
      walletClient.writeContract({
        account,
        chain: previewChain,
        address: saleAddress,
        abi: SALE_ABI,
        functionName: "claimRefund",
      })
    );
  }, [saleAddress, account, run]);

  return { approve, deposit, claimTokens, claimRefund, pendingAction };
}
