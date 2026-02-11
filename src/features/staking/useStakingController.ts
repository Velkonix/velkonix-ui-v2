import { useCallback, useEffect, useMemo, useState } from "react";

import { useMockEngine } from "../../app/providers/MockEngineProvider";
import { useWallet } from "../../app/providers/WalletProvider";
import type { Address, MockExitQueueItem, MockTxResult, StakingState, Tx } from "../../mock";

const POLL_INTERVAL_MS = 250;

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type OperationName =
  | "convert"
  | "stakeToRewards"
  | "unstakeFromRewards"
  | "claimStakingRewards"
  | "instantExit"
  | "vestingExit"
  | "requestExit"
  | "executeExitFromQueue"
  | "cancelExitRequest";

type ToastTone = "success" | "error" | "info";

type ToastState = {
  tone: ToastTone;
  title: string;
  message: string;
};

export function useStakingController() {
  const engine = useMockEngine();
  const wallet = useWallet();
  const user = (wallet.address as Address | null) ?? null;

  const [renderTick, setRenderTick] = useState(0);
  const [busyOp, setBusyOp] = useState<OperationName | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [txIds, setTxIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRenderTick((value) => value + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const stakingState = useMemo<StakingState>(
    () =>
      user
        ? engine.selectors.getStakingState(user)
        : {
            velkBalance: 0,
            staked: 0,
            rewards: 0,
            apr: 0,
            instantExitPenaltyBps: 0,
            exitQueue: [],
          },
    [engine, renderTick, user]
  );

  const queueEntries = useMemo<MockExitQueueItem[]>(
    () =>
      user
        ? engine.selectors
            .getExitQueueEntries(user)
            .filter((item) => item.status === "queued" || item.status === "ready")
            .map((item) => ({
              ...item,
              canExit: item.status === "ready" || Date.now() >= item.unlockDate,
            }))
        : [],
    [engine, renderTick, user]
  );

  const recentTxs = useMemo<Tx[]>(
    () =>
      txIds
        .map((id) => engine.selectors.getTx(id))
        .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
        .slice(0, 8),
    [engine, txIds, renderTick]
  );

  const runOperation = useCallback(
    async (opName: OperationName, operation: () => Promise<MockTxResult>) => {
      if (!user) {
        setLastError("WALLET_NOT_CONNECTED");
        setToast({
          tone: "error",
          title: "Wallet required",
          message: "Connect wallet before sending transaction.",
        });
        return;
      }

      setBusyOp(opName);
      setLastError(null);
      setToast(null);
      const before = new Set(engine.selectors.getTxPool().map((tx) => tx.id));
      const operationPromise = operation();
      const createdTx = engine.selectors.getTxPool().find((tx) => !before.has(tx.id));
      if (createdTx) {
        setTxIds((prev) => [createdTx.id, ...prev.filter((id) => id !== createdTx.id)]);
      }

      const result = await operationPromise;
      setTxIds((prev) => [result.txId, ...prev.filter((id) => id !== result.txId)]);
      if (result.status === "failed") {
        const errorCode = result.error ?? "UNKNOWN_ERROR";
        setLastError(errorCode);
        setToast({
          tone: "error",
          title: `${opName.toUpperCase()} failed`,
          message: errorCode,
        });
      } else {
        setToast({
          tone: "success",
          title: `${opName.toUpperCase()} success`,
          message: `Transaction ${result.txId} completed successfully.`,
        });
      }
      setBusyOp(null);
    },
    [engine, user]
  );

  const convert = useCallback(
    async (amountText: string) => {
      await runOperation("convert", () => engine.staking.convert(user as Address, parseAmount(amountText)));
    },
    [engine.staking, runOperation, user]
  );

  const stakeToRewards = useCallback(
    async (amountText: string) => {
      await runOperation("stakeToRewards", () => engine.staking.stakeToRewards(user as Address, parseAmount(amountText)));
    },
    [engine.staking, runOperation, user]
  );

  const unstakeFromRewards = useCallback(
    async (amountText: string) => {
      await runOperation("unstakeFromRewards", () =>
        engine.staking.unstakeFromRewards(user as Address, parseAmount(amountText))
      );
    },
    [engine.staking, runOperation, user]
  );

  const claimStakingRewards = useCallback(async () => {
    await runOperation("claimStakingRewards", () => engine.staking.claimStakingRewards(user as Address));
  }, [engine.staking, runOperation, user]);

  const instantExit = useCallback(
    async (amountText: string) => {
      await runOperation("instantExit", () => engine.staking.instantExit(user as Address, parseAmount(amountText)));
    },
    [engine.staking, runOperation, user]
  );

  const vestingExit = useCallback(async () => {
    await runOperation("vestingExit", () => engine.staking.vestingExit(user as Address));
  }, [engine.staking, runOperation, user]);

  const requestExit = useCallback(
    async (amountText: string) => {
      await runOperation("requestExit", () => engine.staking.requestExit(user as Address, parseAmount(amountText)));
    },
    [engine.staking, runOperation, user]
  );

  const executeExitFromQueue = useCallback(
    async (queueItemId: string) => {
      await runOperation("executeExitFromQueue", () => engine.staking.executeExitFromQueue(user as Address, queueItemId));
    },
    [engine.staking, runOperation, user]
  );

  const cancelExitRequest = useCallback(
    async (queueItemId: string) => {
      await runOperation("cancelExitRequest", () => engine.staking.cancelExitRequest(user as Address, queueItemId));
    },
    [engine.staking, runOperation, user]
  );

  return {
    wallet,
    user,
    busyOp,
    lastError,
    toast,
    stakingState,
    queueEntries,
    recentTxs,
    convert,
    stakeToRewards,
    unstakeFromRewards,
    claimStakingRewards,
    instantExit,
    vestingExit,
    requestExit,
    executeExitFromQueue,
    cancelExitRequest,
    clearToast: () => setToast(null),
  };
}
