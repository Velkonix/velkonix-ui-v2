import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, http, maxUint256, parseUnits } from "viem";
import type { Address, PublicClient } from "viem";

import { getActiveNetworkConfig, isStakingConfigured } from "../../config/networks";
import { useWallet } from "../../app/providers/WalletProvider";
import type { ExitQueueItem, StakingState } from "../../domain/types";
import { loadStakingState, type StakingSnapshot } from "./loadStakingState";
import { REWARDS_DISTRIBUTOR_ABI, STAKING_ABI, STAKING_TOKEN_ABI } from "./stakingAbis";

const ONCHAIN_POLL_INTERVAL_MS = 15_000;
const USER_REJECTED_REQUEST_MESSAGE = "User rejected the request.";

const networkConfig = getActiveNetworkConfig();
const readClient: PublicClient = createPublicClient({
  chain: networkConfig.viemChain,
  transport: http(networkConfig.rpcUrl),
});

const EMPTY_STAKING_STATE: StakingState = {
  velkBalance: 0,
  staked: 0,
  rewards: 0,
  apr: 0,
  pendingRebase: 0,
  instantExitPenaltyBps: 0,
  exitQueue: [],
};

export type StakingQueueEntry = {
  index: number;
  amount: number;
  startDate: number; // ms
  unlockDate: number; // ms
  canExit: boolean;
  status: "queued" | "ready";
};

type OperationName =
  | "convert"
  | "stakeToRewards"
  | "unstakeFromRewards"
  | "claimStakingRewards"
  | "instantExit"
  | "requestExit"
  | "executeExitFromQueue"
  | "cancelExitRequest";

type ToastTone = "success" | "error" | "info";

type ToastState = {
  tone: ToastTone;
  title: string;
  message: string;
  txUrl?: string;
};

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isUserRejectedRequestError = (message: string): boolean =>
  message.toLowerCase().includes(USER_REJECTED_REQUEST_MESSAGE.toLowerCase()) ||
  message.toLowerCase().includes("user rejected") ||
  message.toLowerCase().includes("user denied");

const toStakingError = (error: unknown): string => {
  if (error instanceof Error) {
    const shortMessage = (error as { shortMessage?: string }).shortMessage;
    return shortMessage ?? error.message;
  }
  return typeof error === "string" ? error : "UNKNOWN_ERROR";
};

export function useStakingController() {
  const wallet = useWallet();
  const user = (wallet.address as Address | null) ?? null;

  const [snapshot, setSnapshot] = useState<StakingSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyOp, setBusyOp] = useState<OperationName | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [, setTxIds] = useState<string[]>([]);

  const configured = isStakingConfigured();
  const loadSeq = useRef(0);

  const loadState = useCallback(async () => {
    if (!configured) {
      setSnapshot(null);
      setLoadError("STAKING_NOT_CONFIGURED");
      return;
    }
    const seq = ++loadSeq.current;
    try {
      const next = await loadStakingState({
        publicClient: readClient,
        network: networkConfig,
        user,
      });
      if (seq === loadSeq.current) {
        setSnapshot(next);
        setLoadError(null);
      }
    } catch (error) {
      if (seq === loadSeq.current) {
        setLoadError(toStakingError(error));
      }
    }
  }, [configured, user]);

  useEffect(() => {
    void loadState();
    if (!configured) {
      return;
    }
    const timer = setInterval(() => {
      void loadState();
    }, ONCHAIN_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [configured, loadState]);

  const stakingState = useMemo<StakingState>(() => {
    if (!snapshot) {
      return EMPTY_STAKING_STATE;
    }
    const exitQueue: ExitQueueItem[] = snapshot.exitQueue.map((entry) => ({
      startDate: entry.exitInitiatedAt * 1000,
      amount: entry.amount,
      canExit: entry.canExit,
    }));
    return {
      velkBalance: snapshot.velkBalance,
      staked: snapshot.stakedAmount,
      rewards: snapshot.pendingRewards,
      apr: snapshot.aprEstimate,
      pendingRebase: 0,
      instantExitPenaltyBps: snapshot.instantExitPenaltyBps,
      exitQueue,
    };
  }, [snapshot]);

  const queueEntries = useMemo<StakingQueueEntry[]>(() => {
    if (!snapshot) {
      return [];
    }
    return snapshot.exitQueue.map((entry) => ({
      index: entry.index,
      amount: entry.amount,
      startDate: entry.exitInitiatedAt * 1000,
      unlockDate: entry.unlockAt * 1000,
      canExit: entry.canExit,
      status: entry.canExit ? "ready" : "queued",
    }));
  }, [snapshot]);

  const runOperation = useCallback(
    async (opName: OperationName, operation: () => Promise<`0x${string}`>) => {
      if (!user) {
        setLastError("WALLET_NOT_CONNECTED");
        setToast({
          tone: "error",
          title: "Wallet required",
          message: "Connect wallet before sending transaction.",
        });
        return;
      }
      if (!configured) {
        setLastError("STAKING_NOT_CONFIGURED");
        setToast({
          tone: "error",
          title: "Staking unavailable",
          message: "Staking contracts are not configured for this network yet.",
        });
        return;
      }
      if (wallet.isWrongNetwork) {
        setLastError("WRONG_NETWORK");
        setToast({
          tone: "error",
          title: "Wrong network",
          message: `Switch to ${networkConfig.label} to continue.`,
        });
        return;
      }
      if (!wallet.publicClient || !wallet.walletClient) {
        setLastError("WALLET_CLIENT_UNAVAILABLE");
        setToast({
          tone: "error",
          title: "Wallet unavailable",
          message: "Reconnect wallet and try again.",
        });
        return;
      }

      setBusyOp(opName);
      setLastError(null);
      setToast(null);
      try {
        const hash = await operation();
        setTxIds((prev) => [hash, ...prev.filter((id) => id !== hash)]);
        const txUrl = `${networkConfig.explorerBaseUrl}/tx/${hash}`;
        setToast({
          tone: "info",
          title: `${opName.toUpperCase()} pending`,
          message: "Transaction submitted — confirming on-chain…",
          txUrl,
        });
        await wallet.publicClient.waitForTransactionReceipt({ hash });
        setToast({
          tone: "success",
          title: `${opName.toUpperCase()} success`,
          message: "Transaction confirmed.",
          txUrl,
        });
        void loadState();
      } catch (error) {
        const errorCode = toStakingError(error);
        if (isUserRejectedRequestError(errorCode)) {
          setLastError(null);
          setToast(null);
          return;
        }
        setLastError(errorCode);
        setToast({
          tone: "error",
          title: `${opName.toUpperCase()} failed`,
          message: errorCode,
        });
      } finally {
        setBusyOp(null);
      }
    },
    [configured, loadState, user, wallet]
  );

  const writeTx = useCallback(
    async (
      address: Address,
      abi: typeof STAKING_ABI | typeof REWARDS_DISTRIBUTOR_ABI | typeof STAKING_TOKEN_ABI,
      functionName: string,
      args: readonly unknown[]
    ): Promise<`0x${string}`> => {
      if (!wallet.walletClient || !wallet.publicClient || !user) {
        throw new Error("WALLET_NOT_READY");
      }
      const { request } = await wallet.publicClient.simulateContract({
        account: user,
        address,
        abi,
        functionName,
        args,
      } as never);
      return wallet.walletClient.writeContract(request as never);
    },
    [user, wallet.publicClient, wallet.walletClient]
  );

  const ensureAllowance = useCallback(
    async (
      token: Address,
      spender: Address,
      currentAllowance: number,
      neededAmount: number
    ): Promise<void> => {
      if (currentAllowance >= neededAmount) {
        return;
      }
      if (!wallet.walletClient || !wallet.publicClient || !user) {
        throw new Error("WALLET_NOT_READY");
      }
      const { request } = await wallet.publicClient.simulateContract({
        account: user,
        address: token,
        abi: STAKING_TOKEN_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
      });
      const hash = await wallet.walletClient.writeContract(request);
      await wallet.publicClient.waitForTransactionReceipt({ hash });
    },
    [user, wallet.publicClient, wallet.walletClient]
  );

  const convert = useCallback(
    async (amountText: string) => {
      const amount = parseAmount(amountText);
      if (amount <= 0 || !snapshot) return;
      await runOperation("convert", async () => {
        const value = parseUnits(amountText, snapshot.velkDecimals);
        await ensureAllowance(
          networkConfig.staking.velk as Address,
          networkConfig.staking.staking as Address,
          snapshot.velkAllowanceToStaking,
          amount
        );
        return writeTx(networkConfig.staking.staking as Address, STAKING_ABI, "stake", [value]);
      });
    },
    [ensureAllowance, runOperation, snapshot, writeTx]
  );

  const stakeToRewards = useCallback(
    async (amountText: string) => {
      const amount = parseAmount(amountText);
      if (amount <= 0 || !snapshot) return;
      await runOperation("stakeToRewards", async () => {
        const value = parseUnits(amountText, snapshot.xvelkDecimals);
        await ensureAllowance(
          networkConfig.staking.xvelk as Address,
          networkConfig.staking.rewardsDistributor as Address,
          snapshot.xvelkAllowanceToRewards,
          amount
        );
        return writeTx(
          networkConfig.staking.rewardsDistributor as Address,
          REWARDS_DISTRIBUTOR_ABI,
          "deposit",
          [value]
        );
      });
    },
    [ensureAllowance, runOperation, snapshot, writeTx]
  );

  const unstakeFromRewards = useCallback(
    async (amountText: string) => {
      if (parseAmount(amountText) <= 0 || !snapshot) return;
      await runOperation("unstakeFromRewards", () => {
        const value = parseUnits(amountText, snapshot.xvelkDecimals);
        return writeTx(
          networkConfig.staking.rewardsDistributor as Address,
          REWARDS_DISTRIBUTOR_ABI,
          "withdraw",
          [value]
        );
      });
    },
    [runOperation, snapshot, writeTx]
  );

  const claimStakingRewards = useCallback(async () => {
    await runOperation("claimStakingRewards", () =>
      writeTx(
        networkConfig.staking.rewardsDistributor as Address,
        REWARDS_DISTRIBUTOR_ABI,
        "claim",
        []
      )
    );
  }, [runOperation, writeTx]);

  const requestExit = useCallback(
    async (amountText: string) => {
      if (parseAmount(amountText) <= 0 || !snapshot) return;
      await runOperation("requestExit", () => {
        const value = parseUnits(amountText, snapshot.xvelkDecimals);
        return writeTx(networkConfig.staking.staking as Address, STAKING_ABI, "initiateExit", [
          value,
        ]);
      });
    },
    [runOperation, snapshot, writeTx]
  );

  const executeExitFromQueue = useCallback(
    async (index: number) => {
      await runOperation("executeExitFromQueue", () =>
        writeTx(networkConfig.staking.staking as Address, STAKING_ABI, "exit", [BigInt(index)])
      );
    },
    [runOperation, writeTx]
  );

  const instantExit = useCallback(
    async (index: number) => {
      await runOperation("instantExit", () =>
        writeTx(networkConfig.staking.staking as Address, STAKING_ABI, "instantExit", [
          BigInt(index),
        ])
      );
    },
    [runOperation, writeTx]
  );

  const cancelExitRequest = useCallback(
    async (index: number) => {
      await runOperation("cancelExitRequest", () =>
        writeTx(networkConfig.staking.staking as Address, STAKING_ABI, "cancelExit", [
          BigInt(index),
        ])
      );
    },
    [runOperation, writeTx]
  );

  return {
    wallet,
    user,
    busyOp,
    lastError,
    loadError,
    toast,
    configured,
    snapshot,
    stakingState,
    queueEntries,
    convert,
    stakeToRewards,
    unstakeFromRewards,
    claimStakingRewards,
    instantExit,
    requestExit,
    executeExitFromQueue,
    cancelExitRequest,
    clearToast: () => setToast(null),
  };
}
