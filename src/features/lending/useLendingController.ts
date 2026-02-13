import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { getActiveNetworkConfig, getAssetConfigByAddress, validateActiveNetworkConfig } from "../../config/networks";
import { useMockEngine } from "../../app/providers/MockEngineProvider";
import { useWallet } from "../../app/providers/WalletProvider";
import type { Asset, AssetId, MockTxResult, Tx, UserBorrow, UserSupply } from "../../mock";
import { AAVE_DATA_PROVIDER_ABI, ERC20_ABI, POOL_ABI } from "./aaveAbis";
import { bpsToPercent, formatUnitsToNumber, parseAmountToUnits, rayToPercent } from "./aaveMath";

const MOCK_POLL_INTERVAL_MS = 250;
const ONCHAIN_POLL_INTERVAL_MS = 15_000;

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type OperationName =
  | "approve"
  | "supply"
  | "withdraw"
  | "borrow"
  | "repay"
  | "setCollateral"
  | "claimLendingRewards";
type ToastTone = "success" | "error" | "info";

type ToastState = {
  tone: ToastTone;
  title: string;
  message: string;
};

type AaveAssetRuntime = Asset & {
  address: Address;
  decimals: number;
};

type AaveState = {
  assets: AaveAssetRuntime[];
  userSupplies: UserSupply[];
  userBorrows: UserBorrow[];
  walletBalances: Record<string, number>;
  allowances: Record<string, number>;
  loading: boolean;
  loadError: string | null;
  hasLoadedOnce: boolean;
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

export type DashboardSupplyRow = {
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  apy: number;
  isCollateral: boolean;
};

export type DashboardBorrowRow = {
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  debt: number;
  apy: number;
};

export type DashboardSummary = {
  netWorth: number;
  averageApy: number;
  borrowUtilization: number;
  totalSupplied: number;
  totalBorrowed: number;
  lendingRewards: number;
};

const EMPTY_AAVE_STATE: AaveState = {
  assets: [],
  userSupplies: [],
  userBorrows: [],
  walletBalances: {},
  allowances: {},
  loading: true,
  loadError: null,
  hasLoadedOnce: false,
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

const normalizeAssetId = (value: string): string => value.toLowerCase();

const toAaveError = (value: unknown): string => {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  return "UNKNOWN_ERROR";
};

export function useLendingController() {
  const engine = useMockEngine();
  const wallet = useWallet();
  const user = (wallet.address as Address | null) ?? null;
  const networkConfig = getActiveNetworkConfig();

  const [renderTick, setRenderTick] = useState(0);
  const [busyOp, setBusyOp] = useState<OperationName | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<MarketSortKey>("asset");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [aaveState, setAaveState] = useState<AaveState>(EMPTY_AAVE_STATE);

  useEffect(() => {
    if (wallet.mode !== "mock") {
      return;
    }
    const timer = setInterval(() => {
      setRenderTick((value) => value + 1);
    }, MOCK_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [wallet.mode]);

  const loadAaveState = useCallback(async () => {
    if (wallet.mode !== "real") {
      return;
    }
    if (!wallet.publicClient) {
      setAaveState((prev) => ({ ...prev, loading: false, loadError: "PUBLIC_CLIENT_UNAVAILABLE", hasLoadedOnce: true }));
      return;
    }
    if (wallet.isWrongNetwork) {
      setAaveState((prev) => ({ ...prev, loading: false, loadError: "WRONG_NETWORK", hasLoadedOnce: true }));
      return;
    }
    const configErrors = validateActiveNetworkConfig();
    if (configErrors.length > 0) {
      setAaveState((prev) => ({
        ...prev,
        loading: false,
        loadError: `NETWORK_CONFIG_ERROR: ${configErrors.join(", ")}`,
        hasLoadedOnce: true,
      }));
      return;
    }

    setAaveState((prev) => ({
      ...prev,
      loading: !prev.hasLoadedOnce,
      loadError: null,
    }));
    try {
      const reserveTokens = await wallet.publicClient.readContract({
        address: networkConfig.deployments.protocolDataProvider,
        abi: AAVE_DATA_PROVIDER_ABI,
        functionName: "getAllReservesTokens",
      });
      const assets = (reserveTokens as Array<{ symbol: string; tokenAddress: Address }>).map((token) => token.tokenAddress);
      if (assets.length === 0) {
        setAaveState({
          assets: [],
          userSupplies: [],
          userBorrows: [],
          walletBalances: {},
          allowances: {},
          loading: false,
          loadError: null,
          hasLoadedOnce: true,
        });
        return;
      }

      const [reserveDataResults, reserveConfigResults, reserveCapsResults] = await Promise.all([
        wallet.publicClient.multicall({
          allowFailure: false,
          contracts: assets.map((asset) => ({
            address: networkConfig.deployments.protocolDataProvider,
            abi: AAVE_DATA_PROVIDER_ABI,
            functionName: "getReserveData",
            args: [asset],
          })),
        }),
        wallet.publicClient.multicall({
          allowFailure: false,
          contracts: assets.map((asset) => ({
            address: networkConfig.deployments.protocolDataProvider,
            abi: AAVE_DATA_PROVIDER_ABI,
            functionName: "getReserveConfigurationData",
            args: [asset],
          })),
        }),
        wallet.publicClient.multicall({
          allowFailure: false,
          contracts: assets.map((asset) => ({
            address: networkConfig.deployments.protocolDataProvider,
            abi: AAVE_DATA_PROVIDER_ABI,
            functionName: "getReserveCaps",
            args: [asset],
          })),
        }),
      ]);

      const userReserveResults =
        user === null
          ? []
          : await wallet.publicClient.multicall({
              allowFailure: false,
              contracts: assets.map((asset) => ({
                address: networkConfig.deployments.protocolDataProvider,
                abi: AAVE_DATA_PROVIDER_ABI,
                functionName: "getUserReserveData",
                args: [asset, user],
              })),
            });

      const walletBalancesResults =
        user === null
          ? []
          : await wallet.publicClient.multicall({
              allowFailure: false,
              contracts: assets.map((asset) => ({
                address: asset,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [user],
              })),
            });

      const allowanceResults =
        user === null
          ? []
          : await wallet.publicClient.multicall({
              allowFailure: false,
              contracts: assets.map((asset) => ({
                address: asset,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [user, networkConfig.deployments.poolProxy],
              })),
            });

      const nextAssets: AaveAssetRuntime[] = [];
      const nextSupplies: UserSupply[] = [];
      const nextBorrows: UserBorrow[] = [];
      const nextWalletBalances: Record<string, number> = {};
      const nextAllowances: Record<string, number> = {};
      const reserveDataList = reserveDataResults as unknown as readonly unknown[];
      const reserveConfigList = reserveConfigResults as unknown as readonly unknown[];
      const reserveCapsList = reserveCapsResults as unknown as readonly unknown[];
      const userReserveList = userReserveResults as unknown as readonly unknown[];
      const walletBalancesList = walletBalancesResults as unknown as readonly unknown[];
      const allowanceList = allowanceResults as unknown as readonly unknown[];

      for (let index = 0; index < assets.length; index += 1) {
        const address = assets[index];
        const tokenInfo = reserveTokens[index] as { symbol: string; tokenAddress: Address };
        const reserveData = reserveDataList[index] as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        const reserveConfig = reserveConfigList[index] as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          boolean,
          boolean,
          boolean,
          boolean,
          boolean,
        ];
        const reserveCaps = reserveCapsList[index] as [bigint, bigint];
        const [
          decimals,
          ltv,
          liquidationThreshold,
          liquidationBonus,
          reserveFactor,
          ,
        ] = reserveConfig;
        const [, , totalAToken, , totalVariableDebt, liquidityRate, variableBorrowRate] = reserveData;
        const [borrowCap] = reserveCaps;
        const normalizedId = normalizeAssetId(address);
        const configuredAsset = getAssetConfigByAddress(address);
        const assetDecimals = Number(decimals);

        const asset: AaveAssetRuntime = {
          id: configuredAsset?.id ?? normalizedId,
          address,
          symbol: configuredAsset?.symbol ?? tokenInfo.symbol,
          name: configuredAsset?.name ?? tokenInfo.symbol,
          icon: configuredAsset?.icon ?? tokenInfo.symbol.toLowerCase(),
          decimals: configuredAsset?.decimals ?? assetDecimals,
          totalSupplied: formatUnitsToNumber(totalAToken, assetDecimals),
          totalBorrowed: formatUnitsToNumber(totalVariableDebt, assetDecimals),
          supplyApy: rayToPercent(liquidityRate),
          borrowApy: rayToPercent(variableBorrowRate),
          maxLtv: bpsToPercent(ltv),
          liquidationThreshold: bpsToPercent(liquidationThreshold),
          liquidationPenalty: bpsToPercent(liquidationBonus > 10_000n ? liquidationBonus - 10_000n : 0n),
          borrowCap: formatUnitsToNumber(borrowCap, assetDecimals),
          reserveFactor: bpsToPercent(reserveFactor),
        };

        nextAssets.push(asset);
        if (user !== null) {
          const userReserve = userReserveList[index] as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          const [currentATokenBalance, , currentVariableDebt, , , , , , usageAsCollateralEnabled] = userReserve;
          const currentSupply = formatUnitsToNumber(currentATokenBalance, assetDecimals);
          const currentDebt = formatUnitsToNumber(currentVariableDebt, assetDecimals);
          if (currentSupply > 0) {
            nextSupplies.push({
              assetId: asset.id,
              balance: currentSupply,
              apy: asset.supplyApy,
              isCollateral: usageAsCollateralEnabled,
            });
          }
          if (currentDebt > 0) {
            nextBorrows.push({
              assetId: asset.id,
              debt: currentDebt,
              apy: asset.borrowApy,
            });
          }
          nextWalletBalances[asset.id] = formatUnitsToNumber(walletBalancesList[index] as bigint, assetDecimals);
          nextAllowances[asset.id] = formatUnitsToNumber(allowanceList[index] as bigint, assetDecimals);
        }
      }

      setAaveState({
        assets: nextAssets,
        userSupplies: nextSupplies,
        userBorrows: nextBorrows,
        walletBalances: nextWalletBalances,
        allowances: nextAllowances,
        loading: false,
        loadError: null,
        hasLoadedOnce: true,
      });
    } catch (error) {
      setAaveState((prev) => ({ ...prev, loading: false, loadError: toAaveError(error), hasLoadedOnce: true }));
    }
  }, [
    networkConfig.deployments.poolProxy,
    networkConfig.deployments.protocolDataProvider,
    user,
    wallet.isWrongNetwork,
    wallet.mode,
    wallet.publicClient,
  ]);

  useEffect(() => {
    if (wallet.mode !== "real") {
      return;
    }
    void loadAaveState();
    const timer = setInterval(() => {
      void loadAaveState();
    }, ONCHAIN_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadAaveState, wallet.mode]);

  const mockAssets = engine.selectors.getAssets();
  const mockUserSupplies = user ? engine.selectors.getUserSupplies(user as `0x${string}`) : [];
  const mockUserBorrows = user ? engine.selectors.getUserBorrows(user as `0x${string}`) : [];
  const mockLendingRewards = user ? engine.selectors.getUserLendingRewards(user as `0x${string}`) : 0;

  const assets = wallet.mode === "mock" ? mockAssets : aaveState.assets;
  const userSupplies = wallet.mode === "mock" ? mockUserSupplies : aaveState.userSupplies;
  const userBorrows = wallet.mode === "mock" ? mockUserBorrows : aaveState.userBorrows;
  const lendingRewards = wallet.mode === "mock" ? mockLendingRewards : 0;

  const assetsById = useMemo<Map<AssetId, Asset>>(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets, renderTick]
  );

  const decimalsByAssetId = useMemo<Map<string, number>>(
    () =>
      new Map(
        (wallet.mode === "real" ? aaveState.assets : []).map((asset) => [asset.id, asset.decimals])
      ),
    [aaveState.assets, wallet.mode]
  );

  const addressesByAssetId = useMemo<Map<string, Address>>(
    () =>
      new Map(
        (wallet.mode === "real" ? aaveState.assets : []).map((asset) => [asset.id, asset.address])
      ),
    [aaveState.assets, wallet.mode]
  );

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
      wallet.mode === "mock"
        ? txIds
            .map((id) => engine.selectors.getTx(id))
            .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
            .slice(0, 8)
        : txIds.slice(0, 8).map((id) => ({ id, status: "success" as const })),
    [engine, txIds, wallet.mode, renderTick]
  );

  const dashboardSupplies = useMemo<DashboardSupplyRow[]>(
    () =>
      userSupplies
        .map((supplyItem) => {
          const asset = assetsById.get(supplyItem.assetId);
          if (!asset) {
            return null;
          }

          return {
            assetId: supplyItem.assetId,
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
            balance: supplyItem.balance,
            apy: supplyItem.apy,
            isCollateral: supplyItem.isCollateral,
          };
        })
        .filter((row): row is DashboardSupplyRow => row !== null),
    [assetsById, userSupplies, renderTick]
  );

  const dashboardBorrows = useMemo<DashboardBorrowRow[]>(
    () =>
      userBorrows
        .map((borrowItem) => {
          const asset = assetsById.get(borrowItem.assetId);
          if (!asset) {
            return null;
          }

          return {
            assetId: borrowItem.assetId,
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
            debt: borrowItem.debt,
            apy: borrowItem.apy,
          };
        })
        .filter((row): row is DashboardBorrowRow => row !== null),
    [assetsById, userBorrows, renderTick]
  );

  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const totalSupplied = userSupplies.reduce((sum, item) => sum + item.balance, 0);
    const totalBorrowed = userBorrows.reduce((sum, item) => sum + item.debt, 0);
    const netWorth = totalSupplied - totalBorrowed;

    const weightedSupplyApy = userSupplies.reduce((sum, item) => sum + item.balance * item.apy, 0);
    const weightedBorrowApy = userBorrows.reduce((sum, item) => sum + item.debt * item.apy, 0);
    const totalExposure = totalSupplied + totalBorrowed;
    const averageApy = totalExposure > 0 ? (weightedSupplyApy - weightedBorrowApy) / totalExposure : 0;
    const borrowUtilization = totalSupplied > 0 ? (totalBorrowed / totalSupplied) * 100 : 0;

    return {
      netWorth,
      averageApy,
      borrowUtilization,
      totalSupplied,
      totalBorrowed,
      lendingRewards,
    };
  }, [lendingRewards, userBorrows, userSupplies, renderTick]);

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

  const runMockOperation = useCallback(
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

  const runOnchainOperation = useCallback(
    async (
      opName: OperationName,
      operation: () => Promise<`0x${string}`>
    ) => {
      if (!user) {
        setLastError("WALLET_NOT_CONNECTED");
        setToast({
          tone: "error",
          title: "Wallet required",
          message: "Connect wallet before sending transaction.",
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
        await wallet.publicClient.waitForTransactionReceipt({ hash });
        setToast({
          tone: "success",
          title: `${opName.toUpperCase()} success`,
          message: `Transaction ${hash} completed successfully.`,
        });
        void loadAaveState();
      } catch (error) {
        const errorCode = toAaveError(error);
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
    [loadAaveState, networkConfig.label, user, wallet]
  );

  const getAssetById = useCallback(
    (assetId: AssetId): Asset | null => assets.find((asset) => asset.id === assetId || normalizeAssetId(asset.id) === normalizeAssetId(assetId)) ?? null,
    [assets]
  );

  const writePoolTx = useCallback(
    async (
      functionName: "supply" | "withdraw" | "borrow" | "repay" | "setUserUseReserveAsCollateral",
      args: readonly unknown[]
    ) => {
      if (!wallet.walletClient || !wallet.publicClient || !user) {
        throw new Error("WALLET_NOT_READY");
      }
      const { request } = await wallet.publicClient.simulateContract({
        account: user,
        address: networkConfig.deployments.poolProxy,
        abi: POOL_ABI,
        functionName,
        args,
      } as never);
      return wallet.walletClient.writeContract(request as never);
    },
    [networkConfig.deployments.poolProxy, user, wallet.publicClient, wallet.walletClient]
  );

  const approve = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("approve", () => engine.lending.approve(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !wallet.walletClient || !wallet.publicClient || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      const walletClient = wallet.walletClient;
      await runOnchainOperation("approve", async () => {
        if (!walletClient) {
          throw new Error("WALLET_CLIENT_UNAVAILABLE");
        }
        const hash = await walletClient.writeContract({
          account: user,
          address: assetAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [networkConfig.deployments.poolProxy, units],
        } as never);
        return hash;
      });
    },
    [
      addressesByAssetId,
      decimalsByAssetId,
      engine.lending,
      networkConfig.deployments.poolProxy,
      runMockOperation,
      runOnchainOperation,
      user,
      wallet.mode,
      wallet.publicClient,
      wallet.walletClient,
    ]
  );

  const supply = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("supply", () => engine.lending.supply(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      await runOnchainOperation("supply", () =>
        writePoolTx("supply", [assetAddress, units, user, 0])
      );
    },
    [addressesByAssetId, decimalsByAssetId, engine.lending, runMockOperation, runOnchainOperation, user, wallet.mode, writePoolTx]
  );

  const borrow = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("borrow", () => engine.lending.borrow(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      await runOnchainOperation("borrow", () =>
        writePoolTx("borrow", [assetAddress, units, 2, 0, user])
      );
    },
    [addressesByAssetId, decimalsByAssetId, engine.lending, runMockOperation, runOnchainOperation, user, wallet.mode, writePoolTx]
  );

  const withdraw = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("withdraw", () => engine.lending.withdraw(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      await runOnchainOperation("withdraw", () =>
        writePoolTx("withdraw", [assetAddress, units, user])
      );
    },
    [addressesByAssetId, decimalsByAssetId, engine.lending, runMockOperation, runOnchainOperation, user, wallet.mode, writePoolTx]
  );

  const repay = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("repay", () => engine.lending.repay(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      await runOnchainOperation("repay", () =>
        writePoolTx("repay", [assetAddress, units, 2, user])
      );
    },
    [addressesByAssetId, decimalsByAssetId, engine.lending, runMockOperation, runOnchainOperation, user, wallet.mode, writePoolTx]
  );

  const setCollateral = useCallback(
    async (assetId: AssetId, enabled: boolean) => {
      if (wallet.mode === "mock") {
        await runMockOperation("setCollateral", () => engine.lending.setCollateral(user as `0x${string}`, assetId, enabled));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      if (!assetAddress) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      await runOnchainOperation("setCollateral", () =>
        writePoolTx("setUserUseReserveAsCollateral", [assetAddress, enabled])
      );
    },
    [addressesByAssetId, engine.lending, runMockOperation, runOnchainOperation, user, wallet.mode, writePoolTx]
  );

  const claimLendingRewards = useCallback(async () => {
    if (wallet.mode === "mock") {
      await runMockOperation("claimLendingRewards", () => engine.lending.claimLendingRewards(user as `0x${string}`));
      return;
    }
    setToast({
      tone: "info",
      title: "Rewards unavailable",
      message: "Rewards claiming is disabled in core integration mode.",
    });
  }, [engine.lending, runMockOperation, user, wallet.mode]);

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
      if (wallet.mode === "mock") {
        return engine.selectors.getUserAllowance(user as `0x${string}`, assetId);
      }
      return aaveState.allowances[assetId] ?? 0;
    },
    [aaveState.allowances, engine, user, wallet.mode]
  );

  const getWalletBalanceForAsset = useCallback(
    (assetId: AssetId): number => {
      if (!user) {
        return 0;
      }
      if (wallet.mode === "mock") {
        return engine.selectors.getUserBalance(user as `0x${string}`, assetId);
      }
      return aaveState.walletBalances[assetId] ?? 0;
    },
    [aaveState.walletBalances, engine, user, wallet.mode]
  );

  useEffect(() => {
    if (wallet.mode === "real" && aaveState.loadError) {
      setLastError(aaveState.loadError);
    }
  }, [aaveState.loadError, wallet.mode]);

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
    dashboardSupplies,
    dashboardBorrows,
    dashboardSummary,
    lendingRewards,
    isLoading: wallet.mode === "real" ? aaveState.loading : false,
    setSort,
    getAssetById,
    getSupplyForAsset,
    getBorrowForAsset,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    approve,
    supply,
    borrow,
    withdraw,
    repay,
    setCollateral,
    claimLendingRewards,
    clearToast: () => setToast(null),
  };
}
