import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { getActiveNetworkConfig, getAssetConfigByAddress, validateActiveNetworkConfig } from "../../config/networks";
import { useMockEngine } from "../../app/providers/MockEngineProvider";
import { useWallet } from "../../app/providers/WalletProvider";
import type { Asset, AssetId, LendingRewardBalance, MockTxResult, Tx, UserBorrow, UserSupply } from "../../mock";
import { AAVE_DATA_PROVIDER_ABI, ERC20_ABI, ORACLE_ABI, POOL_ABI, WETH_ABI } from "./aaveAbis";
import { bpsToPercent, formatUnitsToNumber, parseAmountToUnits, rayToPercent } from "./aaveMath";
import { defaultLendingIncentivesProvider, type PositionApyBreakdown } from "./incentivesProvider";
import { loadMegaethAaveState } from "./loadMegaethAaveState";

const MOCK_POLL_INTERVAL_MS = 250;
const ONCHAIN_POLL_INTERVAL_MS = 15_000;
const HEALTH_FACTOR_SCALE = 1e18;
const USER_REJECTED_REQUEST_MESSAGE = "User rejected the request.";
const MAX_UINT_256 = 2n ** 256n - 1n;
const MAX_MOCK_APPROVE_AMOUNT = Number.MAX_SAFE_INTEGER;

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
  walletBalancesUsd: Record<string, number | null>;
  nativeBalance: number;
  nativeBalanceUsd: number | null;
  allowances: Record<string, number>;
  userAccountMetrics: UserAccountMetrics | null;
  loading: boolean;
  loadError: string | null;
  hasLoadedOnce: boolean;
};

export type UserAccountMetrics = {
  healthFactor: number | null;
  totalCollateralBase: number;
  totalDebtBase: number;
  availableBorrowsBase: number;
  currentLiquidationThreshold: number;
  ltv: number;
  baseCurrencyUnit: number;
};

export type MarketSortKey = "asset" | "totalSupplied" | "supplyApy" | "totalBorrowed" | "borrowApy";
export type SortDirection = "asc" | "desc";

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  totalSupplied: number;
  totalSuppliedUsd: number | null;
  totalBorrowed: number;
  totalBorrowedUsd: number | null;
  supplyApy: number;
  borrowApy: number;
};

export type DashboardSupplyRow = {
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  balanceUsd: number | null;
  apy: number;
  apyBreakdown: PositionApyBreakdown;
  isCollateral: boolean;
};

export type DashboardBorrowRow = {
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  debt: number;
  debtUsd: number | null;
  apy: number;
  apyBreakdown: PositionApyBreakdown;
};

export type DashboardNetApyBreakdown = {
  baseApy: number;
  rewardApyTotal: number;
  totalApy: number;
};

export type DashboardSummary = {
  netWorth: number;
  netWorthUsd: number | null;
  averageApy: number;
  averageApyBase: number;
  averageApyRewards: number;
  averageApyBreakdown: DashboardNetApyBreakdown;
  borrowUtilization: number;
  totalSupplied: number;
  totalSuppliedUsd: number | null;
  totalBorrowed: number;
  totalBorrowedUsd: number | null;
  lendingRewards: number;
  lendingRewardsBreakdown: LendingRewardBalance[];
};

const EMPTY_AAVE_STATE: AaveState = {
  assets: [],
  userSupplies: [],
  userBorrows: [],
  walletBalances: {},
  walletBalancesUsd: {},
  nativeBalance: 0,
  nativeBalanceUsd: null,
  allowances: {},
  userAccountMetrics: null,
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
        return factor * ((left.totalSuppliedUsd ?? left.totalSupplied) - (right.totalSuppliedUsd ?? right.totalSupplied));
      case "supplyApy":
        return factor * (left.supplyApy - right.supplyApy);
      case "totalBorrowed":
        return factor * ((left.totalBorrowedUsd ?? left.totalBorrowed) - (right.totalBorrowedUsd ?? right.totalBorrowed));
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

const isUserRejectedRequestError = (value: string): boolean =>
  value.includes(USER_REJECTED_REQUEST_MESSAGE);

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
      if (networkConfig.key === "megaeth-mainnet") {
        const snapshot = await loadMegaethAaveState({
          publicClient: wallet.publicClient,
          network: networkConfig,
          user,
        });
        setAaveState({
          assets: snapshot.assets,
          userSupplies: snapshot.userSupplies,
          userBorrows: snapshot.userBorrows,
          walletBalances: snapshot.walletBalances,
          walletBalancesUsd: snapshot.walletBalancesUsd,
          nativeBalance: snapshot.nativeBalance,
          nativeBalanceUsd: snapshot.nativeBalanceUsd,
          allowances: snapshot.allowances,
          userAccountMetrics: snapshot.userAccountMetrics,
          loading: false,
          loadError: null,
          hasLoadedOnce: true,
        });
        return;
      }

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
          walletBalancesUsd: {},
          nativeBalance: 0,
          nativeBalanceUsd: null,
          allowances: {},
          userAccountMetrics: null,
          loading: false,
          loadError: null,
          hasLoadedOnce: true,
        });
        return;
      }

      const [reserveDataResults, reserveConfigResults, reserveCapsResults, oraclePriceResults, oracleBaseCurrencyUnit] =
        await Promise.all([
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
        wallet.publicClient.multicall({
          allowFailure: false,
          contracts: assets.map((asset) => ({
            address: networkConfig.deployments.aaveOracle,
            abi: ORACLE_ABI,
            functionName: "getAssetPrice",
            args: [asset],
          })),
        }),
        wallet.publicClient.readContract({
          address: networkConfig.deployments.aaveOracle,
          abi: ORACLE_ABI,
          functionName: "BASE_CURRENCY_UNIT",
        }),
      ]);

      const [userReserveResults, walletBalancesResults, allowanceResults, userAccountDataResult, nativeBalanceRaw] =
        user === null
          ? [[], [], [], null, 0n]
          : await Promise.all([
              wallet.publicClient.multicall({
                allowFailure: false,
                contracts: assets.map((asset) => ({
                  address: networkConfig.deployments.protocolDataProvider,
                  abi: AAVE_DATA_PROVIDER_ABI,
                  functionName: "getUserReserveData",
                  args: [asset, user],
                })),
              }),
              wallet.publicClient.multicall({
                allowFailure: false,
                contracts: assets.map((asset) => ({
                  address: asset,
                  abi: ERC20_ABI,
                  functionName: "balanceOf",
                  args: [user],
                })),
              }),
              wallet.publicClient.multicall({
                allowFailure: false,
                contracts: assets.map((asset) => ({
                  address: asset,
                  abi: ERC20_ABI,
                  functionName: "allowance",
                  args: [user, networkConfig.deployments.poolProxy],
                })),
              }),
              wallet.publicClient.readContract({
                address: networkConfig.deployments.poolProxy,
                abi: POOL_ABI,
                functionName: "getUserAccountData",
                args: [user],
              }),
              wallet.publicClient.getBalance({
                address: user,
              }),
            ]);

      const nextAssets: AaveAssetRuntime[] = [];
      const nextSupplies: UserSupply[] = [];
      const nextBorrows: UserBorrow[] = [];
      const nextWalletBalances: Record<string, number> = {};
      const nextWalletBalancesUsd: Record<string, number | null> = {};
      const nextAllowances: Record<string, number> = {};
      const reserveDataList = reserveDataResults as unknown as readonly unknown[];
      const reserveConfigList = reserveConfigResults as unknown as readonly unknown[];
      const reserveCapsList = reserveCapsResults as unknown as readonly unknown[];
      const oraclePriceList = oraclePriceResults as unknown as readonly unknown[];
      const userReserveList = userReserveResults as unknown as readonly unknown[];
      const walletBalancesList = walletBalancesResults as unknown as readonly unknown[];
      const allowanceList = allowanceResults as unknown as readonly unknown[];
      const oracleBaseUnit = oracleBaseCurrencyUnit as bigint;
      const hasOracleBaseUnit = oracleBaseUnit > 0n;
      const baseCurrencyUnit = hasOracleBaseUnit ? Number(oracleBaseUnit) : 0;
      const nativeBalance = user === null ? 0 : formatUnitsToNumber(nativeBalanceRaw as bigint, 18);
      let wethOraclePrice: number | null = null;

      const userAccountMetrics: UserAccountMetrics | null =
        userAccountDataResult === null
          ? null
          : (() => {
              const [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactorRaw] =
                userAccountDataResult as [bigint, bigint, bigint, bigint, bigint, bigint];
              const healthFactorValue = Number(healthFactorRaw) / HEALTH_FACTOR_SCALE;
              const isInfiniteHealthFactor = healthFactorRaw >= (2n ** 256n - 1n) / 2n;
              return {
                healthFactor:
                  isInfiniteHealthFactor || !Number.isFinite(healthFactorValue) ? Number.POSITIVE_INFINITY : healthFactorValue,
                totalCollateralBase: Number(totalCollateralBase),
                totalDebtBase: Number(totalDebtBase),
                availableBorrowsBase: Number(availableBorrowsBase),
                currentLiquidationThreshold: Number(currentLiquidationThreshold),
                ltv: Number(ltv),
                baseCurrencyUnit,
              };
            })();

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
        const oraclePriceRaw = oraclePriceList[index] as bigint;
        const normalizedId = normalizeAssetId(address);
        const configuredAsset = getAssetConfigByAddress(address);
        const assetDecimals = Number(decimals);

        const oraclePrice = hasOracleBaseUnit ? Number(oraclePriceRaw) / baseCurrencyUnit : undefined;
        const hasOraclePrice = oraclePrice !== undefined && Number.isFinite(oraclePrice) && oraclePrice > 0;
        if (tokenInfo.symbol.toUpperCase() === "WETH" && hasOraclePrice) {
          wethOraclePrice = oraclePrice;
        }
        const totalSupplied = formatUnitsToNumber(totalAToken, assetDecimals);
        const totalBorrowed = formatUnitsToNumber(totalVariableDebt, assetDecimals);
        const borrowCapValue = formatUnitsToNumber(borrowCap, assetDecimals);
        const totalSuppliedUsd = hasOraclePrice ? totalSupplied * oraclePrice : null;
        const totalBorrowedUsd = hasOraclePrice ? totalBorrowed * oraclePrice : null;
        const availableLiquidityUsd =
          hasOraclePrice ? Math.max(0, totalSupplied - totalBorrowed) * oraclePrice : null;
        const borrowCapUsd = hasOraclePrice ? borrowCapValue * oraclePrice : null;

        const asset: AaveAssetRuntime = {
          id: configuredAsset?.id ?? normalizedId,
          address,
          symbol: configuredAsset?.symbol ?? tokenInfo.symbol,
          name: configuredAsset?.name ?? tokenInfo.symbol,
          icon: configuredAsset?.icon ?? tokenInfo.symbol.toLowerCase(),
          decimals: configuredAsset?.decimals ?? assetDecimals,
          totalSupplied,
          totalSuppliedUsd,
          totalBorrowed,
          totalBorrowedUsd,
          availableLiquidityUsd,
          supplyApy: rayToPercent(liquidityRate),
          borrowApy: rayToPercent(variableBorrowRate),
          maxLtv: bpsToPercent(ltv),
          liquidationThreshold: bpsToPercent(liquidationThreshold),
          liquidationPenalty: bpsToPercent(liquidationBonus > 10_000n ? liquidationBonus - 10_000n : 0n),
          borrowCap: borrowCapValue,
          borrowCapUsd,
          reserveFactor: bpsToPercent(reserveFactor),
          oraclePrice: hasOraclePrice ? oraclePrice : undefined,
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
              balanceUsd: hasOraclePrice ? currentSupply * oraclePrice : null,
              apy: asset.supplyApy,
              isCollateral: usageAsCollateralEnabled,
            });
          }
          if (currentDebt > 0) {
            nextBorrows.push({
              assetId: asset.id,
              debt: currentDebt,
              debtUsd: hasOraclePrice ? currentDebt * oraclePrice : null,
              apy: asset.borrowApy,
            });
          }
          const walletBalance = formatUnitsToNumber(walletBalancesList[index] as bigint, assetDecimals);
          nextWalletBalances[asset.id] = walletBalance;
          nextWalletBalancesUsd[asset.id] = hasOraclePrice ? walletBalance * oraclePrice : null;
          nextAllowances[asset.id] = formatUnitsToNumber(allowanceList[index] as bigint, assetDecimals);
        }
      }

      const nativeBalanceUsd = wethOraclePrice !== null ? nativeBalance * wethOraclePrice : null;

      setAaveState({
        assets: nextAssets,
        userSupplies: nextSupplies,
        userBorrows: nextBorrows,
        walletBalances: nextWalletBalances,
        walletBalancesUsd: nextWalletBalancesUsd,
        nativeBalance,
        nativeBalanceUsd,
        allowances: nextAllowances,
        userAccountMetrics,
        loading: false,
        loadError: null,
        hasLoadedOnce: true,
      });
    } catch (error) {
      const errorCode = toAaveError(error);
      setAaveState((prev) => ({
        ...prev,
        loading: false,
        loadError: isUserRejectedRequestError(errorCode) ? null : errorCode,
        hasLoadedOnce: true,
      }));
    }
  }, [
    networkConfig,
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
  const mockLendingRewardsBreakdown = user ? engine.selectors.getUserLendingRewardsBreakdown(user as `0x${string}`) : [];

  const assets =
    wallet.mode === "mock"
      ? mockAssets.map((asset) => ({
          ...asset,
          totalSuppliedUsd: asset.totalSupplied,
          totalBorrowedUsd: asset.totalBorrowed,
          availableLiquidityUsd: Math.max(0, asset.totalSupplied - asset.totalBorrowed),
          borrowCapUsd: (asset.borrowCap ?? 0),
        }))
      : aaveState.assets;
  const userSupplies = wallet.mode === "mock" ? mockUserSupplies : aaveState.userSupplies;
  const userBorrows = wallet.mode === "mock" ? mockUserBorrows : aaveState.userBorrows;
  const lendingRewards = wallet.mode === "mock" ? mockLendingRewards : 0;
  const lendingRewardsBreakdown = wallet.mode === "mock" ? mockLendingRewardsBreakdown : [];

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
            totalSuppliedUsd: wallet.mode === "mock" ? asset.totalSupplied : (asset.totalSuppliedUsd ?? null),
          totalBorrowed: asset.totalBorrowed,
            totalBorrowedUsd: wallet.mode === "mock" ? asset.totalBorrowed : (asset.totalBorrowedUsd ?? null),
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
          const apyBreakdown = defaultLendingIncentivesProvider.getSupplyApyBreakdown(supplyItem);

          return {
            assetId: supplyItem.assetId,
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
            balance: supplyItem.balance,
            balanceUsd:
              wallet.mode === "mock"
                ? supplyItem.balance
                : (supplyItem.balanceUsd ?? (asset.oraclePrice ? supplyItem.balance * asset.oraclePrice : null)),
            apy: apyBreakdown.totalApy,
            apyBreakdown,
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
          const apyBreakdown = defaultLendingIncentivesProvider.getBorrowApyBreakdown(borrowItem);

          return {
            assetId: borrowItem.assetId,
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
            debt: borrowItem.debt,
            debtUsd:
              wallet.mode === "mock"
                ? borrowItem.debt
                : (borrowItem.debtUsd ?? (asset.oraclePrice ? borrowItem.debt * asset.oraclePrice : null)),
            apy: apyBreakdown.totalApy,
            apyBreakdown,
          };
        })
        .filter((row): row is DashboardBorrowRow => row !== null),
    [assetsById, userBorrows, renderTick]
  );

  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const totalSupplied = userSupplies.reduce((sum, item) => sum + item.balance, 0);
    const totalBorrowed = userBorrows.reduce((sum, item) => sum + item.debt, 0);
    const totalSuppliedUsdRaw = dashboardSupplies.reduce((sum, item) => sum + (item.balanceUsd ?? 0), 0);
    const totalBorrowedUsdRaw = dashboardBorrows.reduce((sum, item) => sum + (item.debtUsd ?? 0), 0);
    const hasUsdCoverage =
      wallet.mode === "mock"
        ? true
        : dashboardSupplies.every((item) => item.balanceUsd !== null) && dashboardBorrows.every((item) => item.debtUsd !== null);
    const totalSuppliedUsd = hasUsdCoverage ? totalSuppliedUsdRaw : null;
    const totalBorrowedUsd = hasUsdCoverage ? totalBorrowedUsdRaw : null;
    const netWorthToken = totalSupplied - totalBorrowed;
    const netWorthUsd = hasUsdCoverage ? totalSuppliedUsdRaw - totalBorrowedUsdRaw : null;
    const netWorth = wallet.mode === "real" ? (netWorthUsd ?? netWorthToken) : netWorthToken;

    const weightedSupplyBaseApy =
      wallet.mode === "real"
        ? dashboardSupplies.reduce((sum, item) => sum + (item.balanceUsd ?? 0) * item.apyBreakdown.baseApy, 0)
        : userSupplies.reduce(
            (sum, item) => sum + item.balance * defaultLendingIncentivesProvider.getSupplyApyBreakdown(item).baseApy,
            0
          );
    const weightedSupplyRewardApy =
      wallet.mode === "real"
        ? dashboardSupplies.reduce((sum, item) => sum + (item.balanceUsd ?? 0) * item.apyBreakdown.rewardApyTotal, 0)
        : userSupplies.reduce(
            (sum, item) => sum + item.balance * defaultLendingIncentivesProvider.getSupplyApyBreakdown(item).rewardApyTotal,
            0
          );
    const weightedBorrowBaseApy =
      wallet.mode === "real"
        ? dashboardBorrows.reduce((sum, item) => sum + (item.debtUsd ?? 0) * item.apyBreakdown.baseApy, 0)
        : userBorrows.reduce(
            (sum, item) => sum + item.debt * defaultLendingIncentivesProvider.getBorrowApyBreakdown(item).baseApy,
            0
          );
    const weightedBorrowRewardApy =
      wallet.mode === "real"
        ? dashboardBorrows.reduce((sum, item) => sum + (item.debtUsd ?? 0) * item.apyBreakdown.rewardApyTotal, 0)
        : userBorrows.reduce(
            (sum, item) => sum + item.debt * defaultLendingIncentivesProvider.getBorrowApyBreakdown(item).rewardApyTotal,
            0
          );
    const totalSuppliedBase = wallet.mode === "real" ? totalSuppliedUsdRaw : totalSupplied;
    const totalBorrowedBase = wallet.mode === "real" ? totalBorrowedUsdRaw : totalBorrowed;
    const earnedBaseApy = totalSuppliedBase > 0 ? weightedSupplyBaseApy / totalSuppliedBase : 0;
    const earnedRewardApy = totalSuppliedBase > 0 ? weightedSupplyRewardApy / totalSuppliedBase : 0;
    const debtBaseApy = totalBorrowedBase > 0 ? weightedBorrowBaseApy / totalBorrowedBase : 0;
    const debtRewardApy = totalBorrowedBase > 0 ? weightedBorrowRewardApy / totalBorrowedBase : 0;
    const netWorthBase =
      wallet.mode === "real"
        ? (netWorthUsd ?? 0)
        : netWorthToken;
    const safeNetWorthBase = netWorthBase !== 0 ? netWorthBase : 1;
    const averageApyBase =
      earnedBaseApy * (totalSuppliedBase / safeNetWorthBase) -
      debtBaseApy * (totalBorrowedBase / safeNetWorthBase);
    const averageApyRewards =
      earnedRewardApy * (totalSuppliedBase / safeNetWorthBase) -
      debtRewardApy * (totalBorrowedBase / safeNetWorthBase);
    const averageApy = averageApyBase + averageApyRewards;
    const borrowUtilization =
      wallet.mode === "real" && hasUsdCoverage
        ? (totalSuppliedUsdRaw > 0 ? (totalBorrowedUsdRaw / totalSuppliedUsdRaw) * 100 : 0)
        : (totalSupplied > 0 ? (totalBorrowed / totalSupplied) * 100 : 0);

    return {
      netWorth,
      netWorthUsd,
      averageApy,
      averageApyBase,
      averageApyRewards,
      averageApyBreakdown: {
        baseApy: averageApyBase,
        rewardApyTotal: averageApyRewards,
        totalApy: averageApy,
      },
      borrowUtilization,
      totalSupplied,
      totalSuppliedUsd,
      totalBorrowed,
      totalBorrowedUsd,
      lendingRewards,
      lendingRewardsBreakdown,
    };
  }, [dashboardBorrows, dashboardSupplies, lendingRewards, lendingRewardsBreakdown, userBorrows, userSupplies, wallet.mode, renderTick]);

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
    async (assetId: AssetId, _amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("approve", () =>
          engine.lending.approve(user as `0x${string}`, assetId, MAX_MOCK_APPROVE_AMOUNT)
        );
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      if (!assetAddress || !wallet.walletClient || !wallet.publicClient || !user) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
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
          args: [networkConfig.deployments.poolProxy, MAX_UINT_256],
        } as never);
        return hash;
      });
    },
    [
      addressesByAssetId,
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

  const supplyWithNativeEth = useCallback(
    async (assetId: AssetId, amountText: string) => {
      if (wallet.mode === "mock") {
        await runMockOperation("supply", () => engine.lending.supply(user as `0x${string}`, assetId, parseAmount(amountText)));
        return;
      }
      const assetAddress = addressesByAssetId.get(assetId);
      const decimals = decimalsByAssetId.get(assetId) ?? 18;
      if (!assetAddress || !user || !wallet.walletClient || !wallet.publicClient) {
        setLastError("ASSET_NOT_FOUND");
        return;
      }
      const units = parseAmountToUnits(parseAmount(amountText), decimals);
      await runOnchainOperation("supply", async () => {
        const walletClient = wallet.walletClient;
        const publicClient = wallet.publicClient;
        if (!walletClient || !publicClient) {
          throw new Error("WALLET_CLIENT_UNAVAILABLE");
        }
        const wrapHash = await walletClient.writeContract({
          account: user,
          address: assetAddress,
          abi: WETH_ABI,
          functionName: "deposit",
          args: [],
          value: units,
        } as never);
        await publicClient.waitForTransactionReceipt({ hash: wrapHash });

        const allowance = await publicClient.readContract({
          address: assetAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [user, networkConfig.deployments.poolProxy],
        });
        if ((allowance as bigint) < units) {
          const approveHash = await walletClient.writeContract({
            account: user,
            address: assetAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [networkConfig.deployments.poolProxy, MAX_UINT_256],
          } as never);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        return writePoolTx("supply", [assetAddress, units, user, 0]);
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
      writePoolTx,
    ]
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

  const getWalletBalanceUsdForAsset = useCallback(
    (assetId: AssetId): number | null => {
      if (!user) {
        return null;
      }
      if (wallet.mode === "mock") {
        return engine.selectors.getUserBalance(user as `0x${string}`, assetId);
      }
      return aaveState.walletBalancesUsd[assetId] ?? null;
    },
    [aaveState.walletBalancesUsd, engine, user, wallet.mode]
  );

  const getNativeBalance = useCallback((): number => {
    if (!user) {
      return 0;
    }
    if (wallet.mode === "mock") {
      const wethAsset = assets.find((asset) => asset.symbol.toUpperCase() === "WETH");
      return wethAsset ? engine.selectors.getUserBalance(user as `0x${string}`, wethAsset.id) : 0;
    }
    return aaveState.nativeBalance;
  }, [aaveState.nativeBalance, assets, engine.selectors, user, wallet.mode]);

  const getNativeBalanceUsd = useCallback((): number | null => {
    if (!user) {
      return null;
    }
    if (wallet.mode === "mock") {
      const wethAsset = assets.find((asset) => asset.symbol.toUpperCase() === "WETH");
      if (!wethAsset) {
        return null;
      }
      const wethBalance = engine.selectors.getUserBalance(user as `0x${string}`, wethAsset.id);
      return wethAsset.oraclePrice ? wethBalance * wethAsset.oraclePrice : wethBalance;
    }
    return aaveState.nativeBalanceUsd;
  }, [aaveState.nativeBalanceUsd, assets, engine.selectors, user, wallet.mode]);

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
    userAccountMetrics: aaveState.userAccountMetrics,
    lendingRewards,
    isLoading: wallet.mode === "real" ? aaveState.loading : false,
    setSort,
    getAssetById,
    getSupplyForAsset,
    getBorrowForAsset,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    getWalletBalanceUsdForAsset,
    getNativeBalance,
    getNativeBalanceUsd,
    approve,
    supply,
    supplyWithNativeEth,
    borrow,
    withdraw,
    repay,
    setCollateral,
    claimLendingRewards,
    clearToast: () => setToast(null),
  };
}
