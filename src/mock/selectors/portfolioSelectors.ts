import type { Address, Asset, AssetId, StakingState, Tx, UserBorrow, UserSupply } from "../types/contracts";
import type { MockDbState } from "../types/state";
import type { MockExitQueueItem } from "../types/state";

const toStakingState = (state: MockDbState, user: Address): StakingState => {
  const staking = state.users[user]?.staking;
  if (!staking) {
    return {
      velkBalance: 0,
      staked: 0,
      rewards: 0,
      apr: 0,
      instantExitPenaltyBps: 0,
      exitQueue: [],
    };
  }

  return {
    velkBalance: staking.velkBalance,
    staked: staking.staked,
    rewards: staking.rewards,
    apr: staking.apr,
    instantExitPenaltyBps: staking.instantExitPenaltyBps,
    exitQueue: staking.queue
      .filter((item) => item.status === "queued" || item.status === "ready")
      .map((item) => ({
        startDate: item.startDate,
        amount: item.amount,
        canExit: item.status === "ready" || Date.now() >= item.unlockDate,
      })),
  };
};

export class MockSelectors {
  public constructor(private readonly readState: () => MockDbState) {}

  public getAssets(): Asset[] {
    return this.readState().assets;
  }

  public getUserSupplies(user: Address): UserSupply[] {
    return this.readState().users[user]?.supplies ?? [];
  }

  public getUserBorrows(user: Address): UserBorrow[] {
    return this.readState().users[user]?.borrows ?? [];
  }

  public getUserAllowance(user: Address, assetId: AssetId): number {
    return this.readState().users[user]?.allowances[assetId] ?? 0;
  }

  public getUserBalance(user: Address, assetId: AssetId): number {
    return this.readState().users[user]?.balances[assetId] ?? 0;
  }

  public getUserLendingRewards(user: Address): number {
    return this.readState().users[user]?.lendingRewards ?? 0;
  }

  public getStakingState(user: Address): StakingState {
    return toStakingState(this.readState(), user);
  }

  public getTx(txId: string): Tx | null {
    return this.readState().txs[txId] ?? null;
  }

  public getTxPool(): Tx[] {
    return Object.values(this.readState().txs);
  }

  public getCurrentUser(): Address | null {
    const users = Object.keys(this.readState().users) as Address[];
    return users[0] ?? null;
  }

  public getExitQueueEntries(user: Address): MockExitQueueItem[] {
    return this.readState().users[user]?.staking.queue ?? [];
  }
}
