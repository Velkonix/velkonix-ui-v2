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

export interface MockTxOptions {
  op: string;
  user: Address;
  assetId?: AssetId;
  amount?: number;
}

export interface MockTxResult {
  txId: string;
  status: "pending" | "success" | "failed";
  error?: string;
}

export interface LendingMockApi {
  approve(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  supply(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  withdraw(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  borrow(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  repay(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  setCollateral(user: Address, assetId: AssetId, enabled: boolean): Promise<MockTxResult>;
  claimLendingRewards(user: Address): Promise<MockTxResult>;
}

export interface StakingMockApi {
  convert(user: Address, amount: number): Promise<MockTxResult>;
  stakeToRewards(user: Address, amount: number): Promise<MockTxResult>;
  unstakeFromRewards(user: Address, amount: number): Promise<MockTxResult>;
  claimStakingRewards(user: Address): Promise<MockTxResult>;
  instantExit(user: Address, amount: number): Promise<MockTxResult>;
  vestingExit(user: Address): Promise<MockTxResult>;
  requestExit(user: Address, amount: number): Promise<MockTxResult>;
  executeExitFromQueue(user: Address, queueItemId: string): Promise<MockTxResult>;
  cancelExitRequest(user: Address, queueItemId: string): Promise<MockTxResult>;
}
