import type { Address, Asset, Tx, UserBorrow, UserSupply } from "./contracts";

export type MockErrorCode =
  | "INVALID_AMOUNT"
  | "ASSET_NOT_FOUND"
  | "INSUFFICIENT_BALANCE"
  | "INSUFFICIENT_SUPPLY"
  | "INSUFFICIENT_DEBT"
  | "LOCKED"
  | "QUEUE_ITEM_NOT_READY"
  | "QUEUE_ITEM_NOT_FOUND"
  | "NO_REWARDS";

export interface MockExitQueueItem {
  id: string;
  startDate: number;
  unlockDate: number;
  amount: number;
  canExit: boolean;
  status: "queued" | "ready" | "executed" | "cancelled";
}

export interface MockStakingStore {
  velkBalance: number;
  xVelkBalance: number;
  staked: number;
  rewards: number;
  apr: number;
  lockDurationMs: number;
  instantExitPenaltyBps: number;
  depositTimestamp: number;
  rewardsPoolBalance: number;
  queue: MockExitQueueItem[];
}

export interface MockUserState {
  balances: Record<string, number>;
  allowances: Record<string, number>;
  supplies: UserSupply[];
  borrows: UserBorrow[];
  lendingRewards: number;
  staking: MockStakingStore;
}

export interface MockFeatureFlags {
  syntheticExitQueue: boolean;
}

export interface MockSettings {
  schemaVersion: number;
  queueVestingMs: number;
  maxActiveQueueItemsPerUser: number;
  failRateBps: number;
}

export interface MockDbState {
  settings: MockSettings;
  features: MockFeatureFlags;
  assets: Asset[];
  users: Record<Address, MockUserState>;
  txs: Record<string, Tx>;
}
