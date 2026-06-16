import {
  UiIncentiveDataProvider,
  UiPoolDataProvider,
  WalletBalanceProvider,
} from "@aave/contract-helpers";
import { formatReservesAndIncentives, formatUserSummaryAndIncentives } from "@aave/math-utils";
import { ethers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { createPublicClient, http } from "viem";
import type { Address, PublicClient } from "viem";

import type { NetworkConfig } from "../../config/networks";
import { getAssetConfigByAddress } from "../../config/networks";
import type {
  ApyBreakdown,
  ApyRewardEntry,
  Asset,
  UserBorrow,
  UserSupply,
} from "../../domain/types";
import { ERC20_ABI, POOL_ABI } from "./aaveAbis";

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

type Params = {
  publicClient: PublicClient;
  network: NetworkConfig;
  user: Address | null;
};

type IncentiveItem = { rewardTokenSymbol: string; incentiveAPR: string };

const toNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const buildRewardEntries = (
  rewards: readonly IncentiveItem[] | undefined
): { apyTotal: number; entries: ApyRewardEntry[] } => {
  if (!rewards || rewards.length === 0) return { apyTotal: 0, entries: [] };
  const entries: ApyRewardEntry[] = [];
  let apyTotal = 0;
  for (const item of rewards) {
    const apr = toNumber(item.incentiveAPR) * 100;
    if (apr <= 0) continue;
    apyTotal += apr;
    entries.push({ tokenSymbol: item.rewardTokenSymbol, source: "incentives", apy: apr });
  }
  return { apyTotal, entries };
};

export async function loadMegaethAaveState({
  publicClient: _passedPublicClient,
  network,
  user,
}: Params): Promise<MegaethAaveSnapshot> {
  void _passedPublicClient;
  const { deployments, chainId, rpcUrl } = network;
  if (!deployments.uiPoolDataProvider) throw new Error("MISSING_UI_POOL_DATA_PROVIDER");
  if (!deployments.uiIncentiveDataProvider) throw new Error("MISSING_UI_INCENTIVE_DATA_PROVIDER");
  if (!deployments.walletBalanceProvider) throw new Error("MISSING_WALLET_BALANCE_PROVIDER");

  const ethersProvider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, chainId);
  const uiPool = new UiPoolDataProvider({
    uiPoolDataProviderAddress: deployments.uiPoolDataProvider,
    provider: ethersProvider,
    chainId,
  });
  const uiIncentives = new UiIncentiveDataProvider({
    uiIncentiveDataProviderAddress: deployments.uiIncentiveDataProvider,
    provider: ethersProvider,
    chainId,
  });
  const walletBalanceContract = new WalletBalanceProvider({
    walletBalanceProviderAddress: deployments.walletBalanceProvider,
    provider: ethersProvider,
  });
  const viemClient = createPublicClient({ chain: network.viemChain, transport: http(rpcUrl) });

  const reservesResult = await uiPool.getReservesHumanized({
    lendingPoolAddressProvider: deployments.poolAddressesProvider,
  });
  const { reservesData, baseCurrencyData } = reservesResult;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const {
    marketReferenceCurrencyPriceInUsd: marketReferencePriceInUsd,
    marketReferenceCurrencyDecimals,
  } = baseCurrencyData;
  const baseCurrencyUnit = 10 ** marketReferenceCurrencyDecimals;

  const reserveIncentives = await uiIncentives
    .getReservesIncentivesDataHumanized({
      lendingPoolAddressProvider: deployments.poolAddressesProvider,
    })
    .catch(() => []);

  const formattedReserves = formatReservesAndIncentives({
    reserves: reservesData,
    currentTimestamp,
    marketReferencePriceInUsd,
    marketReferenceCurrencyDecimals,
    reserveIncentives,
  }) as Array<
    ReturnType<typeof formatReservesAndIncentives>[number] & {
      symbol: string;
      name: string;
      decimals: number;
      underlyingAsset: string;
      borrowCap: string;
      priceInUSD: string;
      totalLiquidity: string;
      totalDebt: string;
      supplyAPY: string;
      variableBorrowAPY: string;
      reserveFactor: string;
      formattedBaseLTVasCollateral: string;
      formattedReserveLiquidationThreshold: string;
      formattedReserveLiquidationBonus: string;
      aIncentivesData?: IncentiveItem[];
      vIncentivesData?: IncentiveItem[];
    }
  >;

  const assets: MegaethAssetRuntime[] = [];
  let wethOraclePrice: number | null = null;
  const reserveAddresses = reservesData.map((r) => r.underlyingAsset as Address);

  for (const reserve of formattedReserves) {
    const address = reserve.underlyingAsset as Address;
    const normalizedAddress = address.toLowerCase();
    const configuredAsset = getAssetConfigByAddress(address);
    const decimals = configuredAsset?.decimals ?? reserve.decimals;
    const oraclePriceUsd = toNumber(reserve.priceInUSD);
    const hasOraclePrice = oraclePriceUsd > 0;
    if (reserve.symbol.toUpperCase() === "WETH" && hasOraclePrice) {
      wethOraclePrice = oraclePriceUsd;
    }

    const totalSupplied = toNumber(reserve.totalLiquidity);
    const totalBorrowed = toNumber(reserve.totalDebt);
    const totalSuppliedUsd = hasOraclePrice ? totalSupplied * oraclePriceUsd : null;
    const totalBorrowedUsd = hasOraclePrice ? totalBorrowed * oraclePriceUsd : null;
    const availableLiquidityUsd = hasOraclePrice
      ? Math.max(0, totalSupplied - totalBorrowed) * oraclePriceUsd
      : null;
    const borrowCapValue = toNumber(reserve.borrowCap);
    const borrowCapUsd = hasOraclePrice ? borrowCapValue * oraclePriceUsd : null;
    const supplyApy = toNumber(reserve.supplyAPY) * 100;
    const borrowApy = toNumber(reserve.variableBorrowAPY) * 100;
    const liquidationBonusPct = toNumber(reserve.formattedReserveLiquidationBonus) * 100;

    assets.push({
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
      supplyApy,
      borrowApy,
      maxLtv: toNumber(reserve.formattedBaseLTVasCollateral) * 100,
      liquidationThreshold: toNumber(reserve.formattedReserveLiquidationThreshold) * 100,
      liquidationPenalty: liquidationBonusPct > 100 ? liquidationBonusPct - 100 : 0,
      borrowCap: borrowCapValue,
      borrowCapUsd,
      reserveFactor: toNumber(reserve.reserveFactor) * 100,
      oraclePrice: hasOraclePrice ? oraclePriceUsd : undefined,
    });
  }

  const userSupplies: UserSupply[] = [];
  const userBorrows: UserBorrow[] = [];
  const walletBalances: Record<string, number> = {};
  const walletBalancesUsd: Record<string, number | null> = {};
  const allowances: Record<string, number> = {};
  let userAccountMetrics: UserAccountMetrics | null = null;
  let nativeBalance = 0;
  let nativeBalanceUsd: number | null = null;

  if (user !== null && reserveAddresses.length > 0) {
    const [
      userReservesResult,
      userIncentivesResult,
      walletBalancesResult,
      allowancesResult,
      userAccountRaw,
      nativeBalanceRaw,
    ] = await Promise.all([
      uiPool.getUserReservesHumanized({
        lendingPoolAddressProvider: deployments.poolAddressesProvider,
        user,
      }),
      uiIncentives
        .getUserReservesIncentivesDataHumanized({
          lendingPoolAddressProvider: deployments.poolAddressesProvider,
          user,
        })
        .catch(() => []),
      walletBalanceContract
        .batchBalanceOf([user], reserveAddresses)
        .catch(() => [] as ethers.BigNumber[]),
      viemClient.multicall({
        allowFailure: false,
        contracts: reserveAddresses.map((asset) => ({
          address: asset,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [user, deployments.poolProxy],
        })),
      }),
      viemClient
        .readContract({
          address: deployments.poolProxy,
          abi: POOL_ABI,
          functionName: "getUserAccountData",
          args: [user],
        })
        .catch(() => null),
      viemClient.getBalance({ address: user }),
    ]);

    const userSummary = formatUserSummaryAndIncentives({
      currentTimestamp,
      marketReferencePriceInUsd,
      marketReferenceCurrencyDecimals,
      userReserves: userReservesResult.userReserves,
      formattedReserves,
      userEmodeCategoryId: userReservesResult.userEmodeCategoryId,
      reserveIncentives,
      userIncentives: userIncentivesResult,
    });

    for (const item of userSummary.userReservesData) {
      const reserve = item.reserve as typeof item.reserve & {
        underlyingAsset: string;
        aIncentivesData?: IncentiveItem[];
        vIncentivesData?: IncentiveItem[];
        supplyAPY: string;
        variableBorrowAPY: string;
      };
      const assetMatch = assets.find(
        (a) => a.address.toLowerCase() === reserve.underlyingAsset.toLowerCase()
      );
      if (!assetMatch) continue;
      const supplyBalance = toNumber(item.underlyingBalance);
      const borrowBalance = toNumber(item.variableBorrows);
      const supplyBaseApy = toNumber(reserve.supplyAPY) * 100;
      const borrowBaseApy = toNumber(reserve.variableBorrowAPY) * 100;
      const supplyRewards = buildRewardEntries(reserve.aIncentivesData);
      const borrowRewards = buildRewardEntries(reserve.vIncentivesData);

      if (supplyBalance > 0) {
        const breakdown: ApyBreakdown = {
          baseApy: supplyBaseApy,
          rewardApy: supplyRewards.apyTotal,
          totalApy: supplyBaseApy + supplyRewards.apyTotal,
          rewards: supplyRewards.entries,
        };
        userSupplies.push({
          assetId: assetMatch.id,
          balance: supplyBalance,
          balanceUsd: toNumber(item.underlyingBalanceUSD),
          apy: breakdown.totalApy,
          apyBreakdown: breakdown,
          isCollateral: item.usageAsCollateralEnabledOnUser,
        });
      }
      if (borrowBalance > 0) {
        const breakdown: ApyBreakdown = {
          baseApy: borrowBaseApy,
          rewardApy: borrowRewards.apyTotal,
          totalApy: Math.max(0, borrowBaseApy - borrowRewards.apyTotal),
          rewards: borrowRewards.entries,
        };
        userBorrows.push({
          assetId: assetMatch.id,
          debt: borrowBalance,
          debtUsd: toNumber(item.variableBorrowsUSD),
          apy: breakdown.totalApy,
          apyBreakdown: breakdown,
        });
      }
    }

    for (let index = 0; index < reserveAddresses.length; index += 1) {
      const assetAddr = reserveAddresses[index];
      const assetMatch = assets.find((a) => a.address.toLowerCase() === assetAddr.toLowerCase());
      if (!assetMatch) continue;
      const balanceRaw = walletBalancesResult[index] ?? ethers.BigNumber.from(0);
      const balance = Number(formatUnits(balanceRaw, assetMatch.decimals));
      walletBalances[assetMatch.id] = balance;
      walletBalancesUsd[assetMatch.id] = assetMatch.oraclePrice
        ? balance * assetMatch.oraclePrice
        : null;
      const allowanceRaw = (allowancesResult as readonly bigint[])[index] ?? 0n;
      allowances[assetMatch.id] = Number(formatUnits(allowanceRaw.toString(), assetMatch.decimals));
    }

    if (userAccountRaw !== null) {
      const [
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThreshold,
        ltv,
        healthFactorRaw,
      ] = userAccountRaw as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
      const hf = Number(healthFactorRaw) / HEALTH_FACTOR_SCALE;
      userAccountMetrics = {
        healthFactor:
          healthFactorRaw >= MAX_UINT_HALF || !Number.isFinite(hf) ? Number.POSITIVE_INFINITY : hf,
        totalCollateralBase: Number(totalCollateralBase),
        totalDebtBase: Number(totalDebtBase),
        availableBorrowsBase: Number(availableBorrowsBase),
        currentLiquidationThreshold: Number(currentLiquidationThreshold),
        ltv: Number(ltv),
        baseCurrencyUnit,
      };
    }

    nativeBalance = Number(formatUnits(nativeBalanceRaw as bigint, 18));
    nativeBalanceUsd = wethOraclePrice !== null ? nativeBalance * wethOraclePrice : null;
  }

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
