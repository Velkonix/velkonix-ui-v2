import type { Address, Asset, StakingState, Tx, UserBorrow, UserSupply } from "../types/contracts";
import type { MockDbState } from "../types/state";

const toStakingState = (state: MockDbState, user: Address): StakingState => {
  const staking = state.users[user]?.staking;
  if (!staking) {
    return {
      staked: 0,
      rewards: 0,
      apr: 0,
      exitQueue: [],
    };
  }

  return {
    staked: staking.staked,
    rewards: staking.rewards,
    apr: staking.apr,
    exitQueue: staking.queue
      .filter((item) => item.status === "queued" || item.status === "ready")
      .map((item) => ({
        startDate: item.startDate,
        amount: item.amount,
        canExit: item.canExit,
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

  public getStakingState(user: Address): StakingState {
    return toStakingState(this.readState(), user);
  }

  public getTx(txId: string): Tx | null {
    return this.readState().txs[txId] ?? null;
  }
}
