import { formatUnits } from "viem";
import type { Address, PublicClient } from "viem";

import type { NetworkConfig } from "../../config/networks";
import { REWARDS_DISTRIBUTOR_ABI, STAKING_ABI, STAKING_TOKEN_ABI } from "./stakingAbis";

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export type ExitQueueEntry = {
  index: number;
  amount: number;
  exitInitiatedAt: number; // unix seconds
  unlockAt: number; // unix seconds
  canExit: boolean;
};

export type StakingSnapshot = {
  velkBalance: number;
  xvelkWalletBalance: number;
  stakedAmount: number;
  rewardsPoolBalance: number;
  pendingRewards: number;
  aprEstimate: number;
  instantExitPenaltyBps: number;
  lockDurationSec: number;
  exitQueue: ExitQueueEntry[];
  velkAllowanceToStaking: number;
  xvelkAllowanceToRewards: number;
  velkDecimals: number;
  xvelkDecimals: number;
};

type Params = {
  publicClient: PublicClient;
  network: NetworkConfig;
  user: Address | null;
  nowSec?: number;
};

const toNumber = (raw: bigint, decimals: number): number => Number(formatUnits(raw, decimals));

export async function loadStakingState({
  publicClient,
  network,
  user,
  nowSec = Math.floor(Date.now() / 1000),
}: Params): Promise<StakingSnapshot> {
  const { staking } = network;
  if (!staking.staking) throw new Error("MISSING_STAKING_ADDRESS");
  if (!staking.rewardsDistributor) throw new Error("MISSING_REWARDS_DISTRIBUTOR_ADDRESS");
  if (!staking.velk) throw new Error("MISSING_VELK_ADDRESS");
  if (!staking.xvelk) throw new Error("MISSING_XVELK_ADDRESS");

  const stakingAddress = staking.staking as Address;
  const rewardsAddress = staking.rewardsDistributor as Address;
  const velkAddress = staking.velk as Address;
  const xvelkAddress = staking.xvelk as Address;

  // Protocol-level reads (independent of the connected user).
  const [
    velkDecimalsRaw,
    xvelkDecimalsRaw,
    penaltyBpsRaw,
    lockDurationRaw,
    totalDepositsRaw,
    pendingRewardsPoolRaw,
    epochDurationRaw,
  ] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { address: velkAddress, abi: STAKING_TOKEN_ABI, functionName: "decimals" },
      { address: xvelkAddress, abi: STAKING_TOKEN_ABI, functionName: "decimals" },
      { address: stakingAddress, abi: STAKING_ABI, functionName: "instantExitPenaltyBps" },
      { address: stakingAddress, abi: STAKING_ABI, functionName: "lockDuration" },
      { address: rewardsAddress, abi: REWARDS_DISTRIBUTOR_ABI, functionName: "totalDeposits" },
      { address: rewardsAddress, abi: REWARDS_DISTRIBUTOR_ABI, functionName: "pendingRewards" },
      { address: rewardsAddress, abi: REWARDS_DISTRIBUTOR_ABI, functionName: "epochDuration" },
    ],
  });

  const velkDecimals = Number(velkDecimalsRaw);
  const xvelkDecimals = Number(xvelkDecimalsRaw);
  const lockDurationSec = Number(lockDurationRaw);
  const instantExitPenaltyBps = Number(penaltyBpsRaw);

  // Best-effort APR: treat the current epoch's pending rewards as the per-epoch
  // rate and annualise it over the pool's total deposits. Rough until a subgraph
  // feed exists. TODO: replace with subgraph-backed historical APR.
  const totalDeposits = toNumber(totalDepositsRaw, xvelkDecimals);
  const pendingRewardsPool = toNumber(pendingRewardsPoolRaw, velkDecimals);
  const epochDurationSec = Number(epochDurationRaw);
  const aprEstimate =
    totalDeposits > 0 && epochDurationSec > 0
      ? (pendingRewardsPool / totalDeposits) * (SECONDS_PER_YEAR / epochDurationSec) * 100
      : 0;

  if (user === null) {
    return {
      velkBalance: 0,
      xvelkWalletBalance: 0,
      stakedAmount: 0,
      rewardsPoolBalance: 0,
      pendingRewards: 0,
      aprEstimate,
      instantExitPenaltyBps,
      lockDurationSec,
      exitQueue: [],
      velkAllowanceToStaking: 0,
      xvelkAllowanceToRewards: 0,
      velkDecimals,
      xvelkDecimals,
    };
  }

  const [
    velkBalanceRaw,
    xvelkBalanceRaw,
    velkAllowanceRaw,
    xvelkAllowanceRaw,
    depositsResult,
    rewardsPoolBalanceRaw,
    pendingRewardsRaw,
  ] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { address: velkAddress, abi: STAKING_TOKEN_ABI, functionName: "balanceOf", args: [user] },
      { address: xvelkAddress, abi: STAKING_TOKEN_ABI, functionName: "balanceOf", args: [user] },
      {
        address: velkAddress,
        abi: STAKING_TOKEN_ABI,
        functionName: "allowance",
        args: [user, stakingAddress],
      },
      {
        address: xvelkAddress,
        abi: STAKING_TOKEN_ABI,
        functionName: "allowance",
        args: [user, rewardsAddress],
      },
      { address: stakingAddress, abi: STAKING_ABI, functionName: "deposits", args: [user] },
      {
        address: rewardsAddress,
        abi: REWARDS_DISTRIBUTOR_ABI,
        functionName: "balanceOf",
        args: [user],
      },
      {
        address: rewardsAddress,
        abi: REWARDS_DISTRIBUTOR_ABI,
        functionName: "pendingRewardsOf",
        args: [user],
      },
    ],
  });

  const [stakedAmountRaw, exitQueueRaw] = depositsResult as readonly [
    bigint,
    readonly { amount: bigint; exitInitiatedAt: bigint }[],
  ];

  const exitQueue: ExitQueueEntry[] = exitQueueRaw.map((entry, index) => {
    const exitInitiatedAt = Number(entry.exitInitiatedAt);
    const unlockAt = exitInitiatedAt + lockDurationSec;
    return {
      index,
      amount: toNumber(entry.amount, xvelkDecimals),
      exitInitiatedAt,
      unlockAt,
      canExit: nowSec >= unlockAt,
    };
  });

  return {
    velkBalance: toNumber(velkBalanceRaw, velkDecimals),
    xvelkWalletBalance: toNumber(xvelkBalanceRaw, xvelkDecimals),
    stakedAmount: toNumber(stakedAmountRaw, xvelkDecimals),
    rewardsPoolBalance: toNumber(rewardsPoolBalanceRaw, xvelkDecimals),
    pendingRewards: toNumber(pendingRewardsRaw, velkDecimals),
    aprEstimate,
    instantExitPenaltyBps,
    lockDurationSec,
    exitQueue,
    velkAllowanceToStaking: toNumber(velkAllowanceRaw, velkDecimals),
    xvelkAllowanceToRewards: toNumber(xvelkAllowanceRaw, xvelkDecimals),
    velkDecimals,
    xvelkDecimals,
  };
}
