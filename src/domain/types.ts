export type Address = `0x${string}`;
export type AssetId = string;

export interface ApyRewardEntry {
  tokenSymbol: string;
  source: string;
  apy: number;
  claimable?: number;
}

export interface ApyBreakdown {
  baseApy: number;
  rewardApy: number;
  totalApy: number;
  rewards: ApyRewardEntry[];
}

export interface LendingRewardBalance {
  tokenSymbol: string;
  amount: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  oraclePrice?: number;
  totalSupplied: number;
  totalSuppliedUsd?: number | null;
  totalBorrowed: number;
  totalBorrowedUsd?: number | null;
  availableLiquidityUsd?: number | null;
  supplyApy: number;
  borrowApy: number;
  maxLtv?: number;
  liquidationThreshold?: number;
  liquidationPenalty?: number;
  borrowCap?: number;
  borrowCapUsd?: number | null;
  reserveFactor?: number;
}

export interface UserSupply {
  assetId: string;
  balance: number;
  balanceUsd?: number | null;
  apy: number;
  apyBreakdown?: ApyBreakdown;
  isCollateral: boolean;
}

export interface UserBorrow {
  assetId: string;
  debt: number;
  debtUsd?: number | null;
  apy: number;
  apyBreakdown?: ApyBreakdown;
}

export interface ExitQueueItem {
  startDate: number;
  amount: number;
  canExit: boolean;
}

export interface StakingState {
  velkBalance: number;
  staked: number;
  rewards: number;
  apr: number;
  pendingRebase: number;
  instantExitPenaltyBps: number;
  exitQueue: ExitQueueItem[];
}

export interface Tx {
  id: string;
  status: "pending" | "success" | "failed";
}

export interface TxResult {
  txId: string;
  status: "pending" | "success" | "failed";
  error?: string;
}
