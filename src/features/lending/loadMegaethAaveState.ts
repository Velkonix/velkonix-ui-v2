import type { Address, PublicClient } from "viem";

import type { NetworkConfig } from "../../config/networks";
import { getAssetConfigByAddress } from "../../config/networks";
import type { ApyBreakdown, ApyRewardEntry, Asset, UserBorrow, UserSupply } from "../../mock";
import {
  ERC20_ABI,
  POOL_ABI,
  UI_INCENTIVE_DATA_PROVIDER_ABI,
  UI_POOL_DATA_PROVIDER_ABI,
  WALLET_BALANCE_PROVIDER_ABI,
} from "./aaveAbis";
import { bpsToPercent, formatUnitsToNumber, rayToPercent } from "./aaveMath";

const RAY = 10n ** 27n;
const SECONDS_PER_YEAR = 31_536_000;
const HEALTH_FACTOR_SCALE = 1e18;
const MAX_UINT_HALF = (2n ** 256n - 1n) / 2n;

export type MegaethAssetRuntime = Asset & {
  address: Address;
  decimals: number;
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

export type MegaethAaveSnapshot = {
  assets: MegaethAssetRuntime[];
  userSupplies: UserSupply[];
  userBorrows: UserBorrow[];
  walletBalances: Record<string, number>;
  walletBalancesUsd: Record<string, number | null>;
  nativeBalance: number;
  nativeBalanceUsd: number | null;
  allowances: Record<string, number>;
  userAccountMetrics: UserAccountMetrics | null;
};

type AggregatedReserve = {
  underlyingAsset: Address;
  name: string;
  symbol: string;
  decimals: bigint;
  baseLTVasCollateral: bigint;
  reserveLiquidationThreshold: bigint;
  reserveLiquidationBonus: bigint;
  reserveFactor: bigint;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
  liquidityRate: bigint;
  variableBorrowRate: bigint;
  stableBorrowRate: bigint;
  lastUpdateTimestamp: number;
  aTokenAddress: Address;
  stableDebtTokenAddress: Address;
  variableDebtTokenAddress: Address;
  interestRateStrategyAddress: Address;
  availableLiquidity: bigint;
  totalPrincipalStableDebt: bigint;
  averageStableRate: bigint;
  stableDebtLastUpdateTimestamp: bigint;
  totalScaledVariableDebt: bigint;
  priceInMarketReferenceCurrency: bigint;
  priceOracle: Address;
  variableRateSlope1: bigint;
  variableRateSlope2: bigint;
  stableRateSlope1: bigint;
  stableRateSlope2: bigint;
  baseStableBorrowRate: bigint;
  baseVariableBorrowRate: bigint;
  optimalUsageRatio: bigint;
  isPaused: boolean;
  isSiloedBorrowing: boolean;
  accruedToTreasury: bigint;
  unbacked: bigint;
  isolationModeTotalDebt: bigint;
  flashLoanEnabled: boolean;
  debtCeiling: bigint;
  debtCeilingDecimals: bigint;
  eModeCategoryId: number;
  borrowCap: bigint;
  supplyCap: bigint;
  eModeLtv: number;
  eModeLiquidationThreshold: number;
  eModeLiquidationBonus: number;
  eModePriceSource: Address;
  eModeLabel: string;
  borrowableInIsolation: boolean;
};

type BaseCurrencyInfo = {
  marketReferenceCurrencyUnit: bigint;
  marketReferenceCurrencyPriceInUsd: bigint;
  networkBaseTokenPriceInUsd: bigint;
  networkBaseTokenPriceDecimals: number;
};

type UserReserve = {
  underlyingAsset: Address;
  scaledATokenBalance: bigint;
  usageAsCollateralEnabledOnUser: boolean;
  stableBorrowRate: bigint;
  scaledVariableDebt: bigint;
  principalStableDebt: bigint;
  stableBorrowLastUpdateTimestamp: bigint;
};

type RewardInfo = {
  rewardTokenSymbol: string;
  rewardTokenAddress: Address;
  rewardOracleAddress: Address;
  emissionPerSecond: bigint;
  incentivesLastUpdateTimestamp: bigint;
  tokenIncentivesIndex: bigint;
  emissionEndTimestamp: bigint;
  rewardPriceFeed: bigint;
  rewardTokenDecimals: number;
  precision: number;
  priceFeedDecimals: number;
};

type IncentiveData = {
  tokenAddress: Address;
  incentiveControllerAddress: Address;
  rewardsTokenInformation: readonly RewardInfo[];
};

type AggregatedReserveIncentive = {
  underlyingAsset: Address;
  aIncentiveData: IncentiveData;
  vIncentiveData: IncentiveData;
  sIncentiveData: IncentiveData;
};

type UserRewardInfo = {
  rewardTokenSymbol: string;
  rewardOracleAddress: Address;
  rewardTokenAddress: Address;
  userUnclaimedRewards: bigint;
  tokenIncentivesUserIndex: bigint;
  rewardPriceFeed: bigint;
  priceFeedDecimals: number;
  rewardTokenDecimals: number;
};

type UserIncentiveData = {
  tokenAddress: Address;
  incentiveControllerAddress: Address;
  userRewardsInformation: readonly UserRewardInfo[];
};

type UserReserveIncentive = {
  underlyingAsset: Address;
  aTokenIncentivesUserData: UserIncentiveData;
  vTokenIncentivesUserData: UserIncentiveData;
  sTokenIncentivesUserData: UserIncentiveData;
};

type Params = {
  publicClient: PublicClient;
  network: NetworkConfig;
  user: Address | null;
};

const scaledToActual = (scaled: bigint, index: bigint): bigint => (scaled * index) / RAY;

const safeNumber = (value: bigint): number => Number(value);

const computeAssetPriceUsd = (
  priceInMarketReferenceCurrency: bigint,
  baseUnit: bigint
): number | null => {
  if (baseUnit === 0n) {
    return null;
  }
  return safeNumber(priceInMarketReferenceCurrency) / safeNumber(baseUnit);
};

const computeSideRewardBreakdown = (
  rewards: readonly RewardInfo[],
  totalSideUsd: number,
  nowSec: number
): { apyTotal: number; entries: ApyRewardEntry[] } => {
  if (totalSideUsd <= 0 || rewards.length === 0) {
    return { apyTotal: 0, entries: [] };
  }
  const entries: ApyRewardEntry[] = [];
  let apyTotal = 0;
  for (const reward of rewards) {
    if (reward.emissionPerSecond === 0n) continue;
    if (Number(reward.emissionEndTimestamp) <= nowSec) continue;
    if (reward.rewardPriceFeed <= 0n) continue;

    const yearlyEmissionTokens =
      formatUnitsToNumber(reward.emissionPerSecond, reward.rewardTokenDecimals) * SECONDS_PER_YEAR;
    const rewardPriceUsd =
      safeNumber(reward.rewardPriceFeed) / 10 ** reward.priceFeedDecimals;
    if (!Number.isFinite(rewardPriceUsd) || rewardPriceUsd <= 0) continue;

    const yearlyEmissionUsd = yearlyEmissionTokens * rewardPriceUsd;
    const apr = (yearlyEmissionUsd / totalSideUsd) * 100;
    if (!Number.isFinite(apr) || apr <= 0) continue;

    apyTotal += apr;
    entries.push({
      tokenSymbol: reward.rewardTokenSymbol,
      source: "incentives",
      apy: apr,
    });
  }
  return { apyTotal, entries };
};

const findIncentiveByAsset = (
  list: readonly AggregatedReserveIncentive[],
  asset: Address
): AggregatedReserveIncentive | undefined =>
  list.find((item) => item.underlyingAsset.toLowerCase() === asset.toLowerCase());

export async function loadMegaethAaveState({
  publicClient,
  network,
  user,
}: Params): Promise<MegaethAaveSnapshot> {
  const { deployments } = network;
  if (!deployments.uiPoolDataProvider) {
    throw new Error("MISSING_UI_POOL_DATA_PROVIDER");
  }
  if (!deployments.uiIncentiveDataProvider) {
    throw new Error("MISSING_UI_INCENTIVE_DATA_PROVIDER");
  }
  if (!deployments.walletBalanceProvider) {
    throw new Error("MISSING_WALLET_BALANCE_PROVIDER");
  }

  const reservesResult = (await publicClient.readContract({
    address: deployments.uiPoolDataProvider,
    abi: UI_POOL_DATA_PROVIDER_ABI,
    functionName: "getReservesData",
    args: [deployments.poolAddressesProvider],
  })) as readonly [readonly AggregatedReserve[], BaseCurrencyInfo];

  const [reservesData, baseCurrency] = reservesResult;
  const reserveIncentives = await publicClient
    .readContract({
      address: deployments.uiIncentiveDataProvider,
      abi: UI_INCENTIVE_DATA_PROVIDER_ABI,
      functionName: "getReservesIncentivesData",
      args: [deployments.poolAddressesProvider],
    })
    .then((value) => value as readonly AggregatedReserveIncentive[])
    .catch(() => [] as readonly AggregatedReserveIncentive[]);

  const reserveAddresses = reservesData.map((reserve) => reserve.underlyingAsset);
  const baseUnit = baseCurrency.marketReferenceCurrencyUnit;
  const baseCurrencyUnit = safeNumber(baseUnit);
  const nowSec = Math.floor(Date.now() / 1000);

  let userReserves: readonly UserReserve[] = [];
  let userIncentives: readonly UserReserveIncentive[] = [];
  let walletBalancesRaw: readonly bigint[] = [];
  let allowancesRaw: readonly bigint[] = [];
  let userAccountDataResult:
    | readonly [bigint, bigint, bigint, bigint, bigint, bigint]
    | null = null;
  let nativeBalanceRaw = 0n;

  if (user !== null && reserveAddresses.length > 0) {
    const [
      userReservesResult,
      userIncentivesResult,
      walletBalancesResult,
      allowancesResult,
      userAccountRaw,
      nativeBalanceValue,
    ] = await Promise.all([
      publicClient.readContract({
        address: deployments.uiPoolDataProvider,
        abi: UI_POOL_DATA_PROVIDER_ABI,
        functionName: "getUserReservesData",
        args: [deployments.poolAddressesProvider, user],
      }),
      publicClient
        .readContract({
          address: deployments.uiIncentiveDataProvider,
          abi: UI_INCENTIVE_DATA_PROVIDER_ABI,
          functionName: "getUserReservesIncentivesData",
          args: [deployments.poolAddressesProvider, user],
        })
        .catch(() => [] as readonly UserReserveIncentive[]),
      publicClient.readContract({
        address: deployments.walletBalanceProvider,
        abi: WALLET_BALANCE_PROVIDER_ABI,
        functionName: "batchBalanceOf",
        args: [[user], reserveAddresses],
      }),
      publicClient.multicall({
        allowFailure: false,
        contracts: reserveAddresses.map((asset) => ({
          address: asset,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [user, deployments.poolProxy],
        })),
      }),
      publicClient
        .readContract({
          address: deployments.poolProxy,
          abi: POOL_ABI,
          functionName: "getUserAccountData",
          args: [user],
        })
        .catch(() => null),
      publicClient.getBalance({ address: user }),
    ]);

    const [reservesList] = userReservesResult as readonly [readonly UserReserve[], number];
    userReserves = reservesList;
    userIncentives = userIncentivesResult as readonly UserReserveIncentive[];
    walletBalancesRaw = walletBalancesResult as readonly bigint[];
    allowancesRaw = allowancesResult as unknown as readonly bigint[];
    userAccountDataResult =
      (userAccountRaw as readonly [bigint, bigint, bigint, bigint, bigint, bigint] | null) ?? null;
    nativeBalanceRaw = nativeBalanceValue as bigint;
  }

  const userReservesByAsset = new Map<string, UserReserve>(
    userReserves.map((reserve) => [reserve.underlyingAsset.toLowerCase(), reserve])
  );

  const assets: MegaethAssetRuntime[] = [];
  const userSupplies: UserSupply[] = [];
  const userBorrows: UserBorrow[] = [];
  const walletBalances: Record<string, number> = {};
  const walletBalancesUsd: Record<string, number | null> = {};
  const allowances: Record<string, number> = {};
  let wethOraclePrice: number | null = null;

  reservesData.forEach((reserve, index) => {
    const address = reserve.underlyingAsset;
    const normalizedAddress = address.toLowerCase();
    const configuredAsset = getAssetConfigByAddress(address);
    const decimals = configuredAsset?.decimals ?? Number(reserve.decimals);

    const oraclePriceUsd = computeAssetPriceUsd(reserve.priceInMarketReferenceCurrency, baseUnit);
    const hasOraclePrice = oraclePriceUsd !== null && oraclePriceUsd > 0;
    if (reserve.symbol.toUpperCase() === "WETH" && hasOraclePrice) {
      wethOraclePrice = oraclePriceUsd;
    }

    const actualDebt = scaledToActual(reserve.totalScaledVariableDebt, reserve.variableBorrowIndex);
    const totalLiquidityRaw = reserve.availableLiquidity + actualDebt;
    const totalSupplied = formatUnitsToNumber(totalLiquidityRaw, decimals);
    const totalBorrowed = formatUnitsToNumber(actualDebt, decimals);
    const borrowCapValue = formatUnitsToNumber(reserve.borrowCap, decimals);
    const totalSuppliedUsd = hasOraclePrice ? totalSupplied * oraclePriceUsd : null;
    const totalBorrowedUsd = hasOraclePrice ? totalBorrowed * oraclePriceUsd : null;
    const availableLiquidityUsd = hasOraclePrice
      ? formatUnitsToNumber(reserve.availableLiquidity, decimals) * oraclePriceUsd
      : null;
    const borrowCapUsd = hasOraclePrice ? borrowCapValue * oraclePriceUsd : null;

    const supplyBaseApy = rayToPercent(reserve.liquidityRate);
    const borrowBaseApy = rayToPercent(reserve.variableBorrowRate);
    const incentive = findIncentiveByAsset(reserveIncentives, address);

    const supplyRewards = incentive
      ? computeSideRewardBreakdown(
          incentive.aIncentiveData.rewardsTokenInformation,
          totalSuppliedUsd ?? 0,
          nowSec
        )
      : { apyTotal: 0, entries: [] };
    const borrowRewards = incentive
      ? computeSideRewardBreakdown(
          incentive.vIncentiveData.rewardsTokenInformation,
          totalBorrowedUsd ?? 0,
          nowSec
        )
      : { apyTotal: 0, entries: [] };

    const asset: MegaethAssetRuntime = {
      id: configuredAsset?.id ?? normalizedAddress,
      address,
      symbol: configuredAsset?.symbol ?? reserve.symbol,
      name: configuredAsset?.name ?? reserve.name,
      icon: configuredAsset?.icon ?? reserve.symbol.toLowerCase(),
      decimals,
      totalSupplied,
      totalSuppliedUsd,
      totalBorrowed,
      totalBorrowedUsd,
      availableLiquidityUsd,
      supplyApy: supplyBaseApy + supplyRewards.apyTotal,
      borrowApy: Math.max(0, borrowBaseApy - borrowRewards.apyTotal),
      maxLtv: bpsToPercent(reserve.baseLTVasCollateral),
      liquidationThreshold: bpsToPercent(reserve.reserveLiquidationThreshold),
      liquidationPenalty: bpsToPercent(
        reserve.reserveLiquidationBonus > 10_000n ? reserve.reserveLiquidationBonus - 10_000n : 0n
      ),
      borrowCap: borrowCapValue,
      borrowCapUsd,
      reserveFactor: bpsToPercent(reserve.reserveFactor),
      oraclePrice: hasOraclePrice ? oraclePriceUsd : undefined,
    };
    assets.push(asset);

    if (user !== null) {
      const userReserve = userReservesByAsset.get(normalizedAddress);
      if (userReserve) {
        const actualSupplyRaw = scaledToActual(userReserve.scaledATokenBalance, reserve.liquidityIndex);
        const actualDebtRaw = scaledToActual(userReserve.scaledVariableDebt, reserve.variableBorrowIndex);
        const currentSupply = formatUnitsToNumber(actualSupplyRaw, decimals);
        const currentDebt = formatUnitsToNumber(actualDebtRaw, decimals);

        if (currentSupply > 0) {
          const breakdown: ApyBreakdown = {
            baseApy: supplyBaseApy,
            rewardApy: supplyRewards.apyTotal,
            totalApy: supplyBaseApy + supplyRewards.apyTotal,
            rewards: supplyRewards.entries,
          };
          userSupplies.push({
            assetId: asset.id,
            balance: currentSupply,
            balanceUsd: hasOraclePrice ? currentSupply * oraclePriceUsd : null,
            apy: breakdown.totalApy,
            apyBreakdown: breakdown,
            isCollateral: userReserve.usageAsCollateralEnabledOnUser,
          });
        }
        if (currentDebt > 0) {
          const breakdown: ApyBreakdown = {
            baseApy: borrowBaseApy,
            rewardApy: borrowRewards.apyTotal,
            totalApy: Math.max(0, borrowBaseApy - borrowRewards.apyTotal),
            rewards: borrowRewards.entries,
          };
          userBorrows.push({
            assetId: asset.id,
            debt: currentDebt,
            debtUsd: hasOraclePrice ? currentDebt * oraclePriceUsd : null,
            apy: breakdown.totalApy,
            apyBreakdown: breakdown,
          });
        }
      }

      const balanceRaw = walletBalancesRaw[index] ?? 0n;
      const walletBalance = formatUnitsToNumber(balanceRaw, decimals);
      walletBalances[asset.id] = walletBalance;
      walletBalancesUsd[asset.id] = hasOraclePrice ? walletBalance * oraclePriceUsd : null;

      const allowanceRaw = allowancesRaw[index] ?? 0n;
      allowances[asset.id] = formatUnitsToNumber(allowanceRaw, decimals);
    }
  });

  // Fallback for WETH/native price if not yet captured (markets without WETH reserve).
  if (wethOraclePrice === null && baseCurrency.networkBaseTokenPriceInUsd > 0n) {
    wethOraclePrice =
      safeNumber(baseCurrency.networkBaseTokenPriceInUsd) /
      10 ** Number(baseCurrency.networkBaseTokenPriceDecimals);
  }

  const userAccountMetrics: UserAccountMetrics | null =
    userAccountDataResult === null
      ? null
      : (() => {
          const [
            totalCollateralBase,
            totalDebtBase,
            availableBorrowsBase,
            currentLiquidationThreshold,
            ltv,
            healthFactorRaw,
          ] = userAccountDataResult;
          const healthFactorValue = Number(healthFactorRaw) / HEALTH_FACTOR_SCALE;
          const isInfinite = healthFactorRaw >= MAX_UINT_HALF;
          return {
            healthFactor: isInfinite || !Number.isFinite(healthFactorValue) ? Number.POSITIVE_INFINITY : healthFactorValue,
            totalCollateralBase: Number(totalCollateralBase),
            totalDebtBase: Number(totalDebtBase),
            availableBorrowsBase: Number(availableBorrowsBase),
            currentLiquidationThreshold: Number(currentLiquidationThreshold),
            ltv: Number(ltv),
            baseCurrencyUnit,
          };
        })();

  void userIncentives; // available for future per-user accrued-rewards aggregation

  const nativeBalance = user === null ? 0 : formatUnitsToNumber(nativeBalanceRaw, 18);
  const nativeBalanceUsd = wethOraclePrice !== null ? nativeBalance * wethOraclePrice : null;

  return {
    assets,
    userSupplies,
    userBorrows,
    walletBalances,
    walletBalancesUsd,
    nativeBalance,
    nativeBalanceUsd,
    allowances,
    userAccountMetrics,
  };
}

