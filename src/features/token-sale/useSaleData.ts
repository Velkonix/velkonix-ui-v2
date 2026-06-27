import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { useWallet } from "../../app/providers/WalletProvider";
import { getTokenSaleConfig, isTokenSaleConfigured } from "../../config/networks";
import { previewPublicClient } from "../../shared/lib/previewChain";
import { ERC20_ABI, SALE_ABI } from "./saleAbi";
import { HARD_CAP_USDC, SALE_ALLOCATION_TOKEN } from "./saleMath";
import type { SaleSchedule, SaleStats, UserSaleState } from "./types";

const POLL_MS = 30_000;

type SaleInfo = {
  stage: number;
  saleStart: bigint;
  saleEnd: bigint;
  saleAllocation: bigint;
  hardCap: bigint;
  totalDeposits: bigint;
  participants: bigint;
  finalized: boolean;
  funded: boolean;
  totalTokensSold: bigint;
  claimDeadline: bigint;
};

type UserInfo = {
  deposited: bigint;
  allocation: bigint;
  refund: bigint;
  tokensClaimed: boolean;
  refundClaimed: boolean;
  claimableTokens: bigint;
  claimableRefund: bigint;
};

export type SaleData = {
  isSaleConfigured: boolean;
  schedule: SaleSchedule;
  stats: SaleStats;
  user: UserSaleState;
  isLoading: boolean;
  refetchAll: () => Promise<void>;
};

const EMPTY_USER: UserSaleState = {
  deposit: 0n,
  usdcBalance: 0n,
  usdcAllowance: 0n,
  tokensClaimed: false,
  refundClaimed: false,
  finalAllocation: null,
  finalRefund: null,
  claimableTokens: 0n,
  claimableRefund: 0n,
};

export function useSaleData(): SaleData {
  const { address } = useWallet();
  const user = (address as Address | null) ?? null;

  const config = getTokenSaleConfig();
  const saleAddress = (config.saleContract || "") as Address | "";
  const usdcAddress = (config.usdc || "") as Address | "";
  const saleConfigured = isTokenSaleConfigured();

  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [usdcBalance, setUsdcBalance] = useState(0n);
  const [usdcAllowance, setUsdcAllowance] = useState(0n);
  const [isLoading, setIsLoading] = useState(saleConfigured);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!saleAddress) {
      setIsLoading(false);
      return;
    }
    const seq = ++loadSeq.current;
    try {
      const nextSaleInfo = (await previewPublicClient.readContract({
        address: saleAddress,
        abi: SALE_ABI,
        functionName: "saleInfo",
      })) as SaleInfo;

      let nextUserInfo: UserInfo | null = null;
      let nextBalance = 0n;
      let nextAllowance = 0n;
      if (user) {
        const [u, bal, allow] = await Promise.all([
          previewPublicClient.readContract({
            address: saleAddress,
            abi: SALE_ABI,
            functionName: "userInfo",
            args: [user],
          }) as Promise<UserInfo>,
          usdcAddress
            ? (previewPublicClient.readContract({
                address: usdcAddress,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [user],
              }) as Promise<bigint>)
            : Promise.resolve(0n),
          usdcAddress
            ? (previewPublicClient.readContract({
                address: usdcAddress,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [user, saleAddress],
              }) as Promise<bigint>)
            : Promise.resolve(0n),
        ]);
        nextUserInfo = u;
        nextBalance = bal;
        nextAllowance = allow;
      }

      if (seq === loadSeq.current) {
        setSaleInfo(nextSaleInfo);
        setUserInfo(nextUserInfo);
        setUsdcBalance(nextBalance);
        setUsdcAllowance(nextAllowance);
        setIsLoading(false);
      }
    } catch {
      if (seq === loadSeq.current) {
        setIsLoading(false);
      }
    }
  }, [saleAddress, usdcAddress, user]);

  useEffect(() => {
    void load();
    if (!saleConfigured) return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, saleConfigured]);

  const finalized = Boolean(saleInfo?.finalized);

  const onChainStart = Number(saleInfo?.saleStart ?? 0n);
  const onChainEnd = Number(saleInfo?.saleEnd ?? 0n);
  const onChainClaimDeadline = Number(saleInfo?.claimDeadline ?? 0n);

  const schedule: SaleSchedule = {
    saleStartMs: (onChainStart || config.contributionStartTs || 0) * 1000,
    saleEndMs: (onChainEnd || config.contributionEndTs || 0) * 1000,
    claimStartMs: 0,
    claimDeadlineMs: onChainClaimDeadline * 1000,
    finalized,
  };

  const stats: SaleStats = {
    totalDeposited: saleInfo?.totalDeposits ?? 0n,
    participantCount: Number(saleInfo?.participants ?? 0n),
    hardCap: saleInfo?.hardCap && saleInfo.hardCap > 0n ? saleInfo.hardCap : HARD_CAP_USDC,
    saleAllocation:
      saleInfo?.saleAllocation && saleInfo.saleAllocation > 0n
        ? saleInfo.saleAllocation
        : SALE_ALLOCATION_TOKEN,
    totalTokensSold: saleInfo?.totalTokensSold ?? 0n,
  };

  const userState: UserSaleState = userInfo
    ? {
        deposit: userInfo.deposited,
        usdcBalance,
        usdcAllowance,
        tokensClaimed: userInfo.tokensClaimed,
        refundClaimed: userInfo.refundClaimed,
        finalAllocation: finalized ? userInfo.allocation : null,
        finalRefund: finalized ? userInfo.refund : null,
        claimableTokens: userInfo.claimableTokens,
        claimableRefund: userInfo.claimableRefund,
      }
    : { ...EMPTY_USER, usdcBalance, usdcAllowance };

  return {
    isSaleConfigured: saleConfigured,
    schedule,
    stats,
    user: userState,
    isLoading: saleConfigured && isLoading,
    refetchAll: load,
  };
}
