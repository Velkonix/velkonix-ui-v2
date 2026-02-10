import { useCallback, useEffect, useMemo, useState } from "react";

import { useMockEngine } from "../../app/providers/MockEngineProvider";
import { useWallet } from "../../app/providers/WalletProvider";
import type { Address, Asset, AssetId, MockTxResult, Tx, UserBorrow, UserSupply } from "../../mock";

const POLL_INTERVAL_MS = 250;

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type OperationName = "approve" | "supply" | "borrow";
type ToastTone = "success" | "error" | "info";

type ToastState = {
  tone: ToastTone;
  title: string;
  message: string;
};

export type MarketSortKey = "asset" | "totalSupplied" | "supplyApy" | "totalBorrowed" | "borrowApy";
export type SortDirection = "asc" | "desc";

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  totalSupplied: number;
  totalBorrowed: number;
  supplyApy: number;
  borrowApy: number;
};

const sortRows = (rows: MarketRow[], key: MarketSortKey, direction: SortDirection): MarketRow[] => {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    switch (key) {
      case "asset":
        return factor * left.symbol.localeCompare(right.symbol);
      case "totalSupplied":
        return factor * (left.totalSupplied - right.totalSupplied);
      case "supplyApy":
        return factor * (left.supplyApy - right.supplyApy);
      case "totalBorrowed":
        return factor * (left.totalBorrowed - right.totalBorrowed);
      case "borrowApy":
        return factor * (left.borrowApy - right.borrowApy);
      default:
        return 0;
    }
  });
};

export function useLendingController() {
  const engine = useMockEngine();
  const wallet = useWallet();
  const user = (wallet.address as Address | null) ?? null;

  const [renderTick, setRenderTick] = useState(0);
  const [busyOp, setBusyOp] = useState<OperationName | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<MarketSortKey>("asset");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const timer = setInterval(() => {
      setRenderTick((value) => value + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const assets = engine.selectors.getAssets();
  const userSupplies = user ? engine.selectors.getUserSupplies(user) : [];
  const userBorrows = user ? engine.selectors.getUserBorrows(user) : [];

  const marketRows = useMemo<MarketRow[]>(
    () =>
      sortRows(
        assets.map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          icon: asset.icon,
          totalSupplied: asset.totalSupplied,
          totalBorrowed: asset.totalBorrowed,
          supplyApy: asset.supplyApy,
          borrowApy: asset.borrowApy,
        })),
        sortKey,
        sortDirection
      ),
    [assets, sortDirection, sortKey, renderTick]
  );

  const recentTxs = useMemo<Tx[]>(
    () =>
      txIds
        .map((id) => engine.selectors.getTx(id))
        .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
        .slice(0, 8),
    [engine, txIds, renderTick]
  );

  const setSort = useCallback(
    (nextKey: MarketSortKey) => {
      if (nextKey === sortKey) {
        setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(nextKey);
      setSortDirection("asc");
    },
    [sortKey]
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

  const getAssetById = useCallback(
    (assetId: AssetId): Asset | null => assets.find((asset) => asset.id === assetId) ?? null,
    [assets]
  );

  const approve = useCallback(
    async (assetId: AssetId, amountText: string) => {
      await runOperation("approve", () => engine.lending.approve(user as Address, assetId, parseAmount(amountText)));
    },
    [engine.lending, runOperation, user]
  );

  const supply = useCallback(
    async (assetId: AssetId, amountText: string) => {
      await runOperation("supply", () => engine.lending.supply(user as Address, assetId, parseAmount(amountText)));
    },
    [engine.lending, runOperation, user]
  );

  const borrow = useCallback(
    async (assetId: AssetId, amountText: string) => {
      await runOperation("borrow", () => engine.lending.borrow(user as Address, assetId, parseAmount(amountText)));
    },
    [engine.lending, runOperation, user]
  );

  const getSupplyForAsset = useCallback(
    (assetId: AssetId): UserSupply | null => userSupplies.find((item) => item.assetId === assetId) ?? null,
    [userSupplies]
  );

  const getBorrowForAsset = useCallback(
    (assetId: AssetId): UserBorrow | null => userBorrows.find((item) => item.assetId === assetId) ?? null,
    [userBorrows]
  );

  const getAllowanceForAsset = useCallback(
    (assetId: AssetId): number => {
      if (!user) {
        return 0;
      }
      return engine.selectors.getUserAllowance(user, assetId);
    },
    [engine, user]
  );

  const getWalletBalanceForAsset = useCallback(
    (assetId: AssetId): number => {
      if (!user) {
        return 0;
      }
      return engine.selectors.getUserBalance(user, assetId);
    },
    [engine, user]
  );

  return {
    wallet,
    user,
    busyOp,
    lastError,
    toast,
    recentTxs,
    sortKey,
    sortDirection,
    marketRows,
    userSupplies,
    userBorrows,
    setSort,
    getAssetById,
    getSupplyForAsset,
    getBorrowForAsset,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    approve,
    supply,
    borrow,
    clearToast: () => setToast(null),
  };
}
