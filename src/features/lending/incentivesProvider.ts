import type { ApyRewardEntry, UserBorrow, UserSupply } from "../../domain/types";

export type LendingPositionSide = "supply" | "borrow";

export type PositionApyBreakdown = {
  side: LendingPositionSide;
  baseApy: number;
  rewardApyTotal: number;
  totalApy: number;
  rewards: ApyRewardEntry[];
};

export interface LendingIncentivesProvider {
  getSupplyApyBreakdown(supply: UserSupply): PositionApyBreakdown;
  getBorrowApyBreakdown(borrow: UserBorrow): PositionApyBreakdown;
}

const toSupplyBreakdown = (supply: UserSupply): PositionApyBreakdown => {
  const breakdown = supply.apyBreakdown;
  if (!breakdown) {
    return {
      side: "supply",
      baseApy: supply.apy,
      rewardApyTotal: 0,
      totalApy: supply.apy,
      rewards: [],
    };
  }
  return {
    side: "supply",
    baseApy: breakdown.baseApy,
    rewardApyTotal: breakdown.rewardApy,
    totalApy: breakdown.totalApy,
    rewards: breakdown.rewards,
  };
};

const toBorrowBreakdown = (borrow: UserBorrow): PositionApyBreakdown => {
  const breakdown = borrow.apyBreakdown;
  if (!breakdown) {
    return {
      side: "borrow",
      baseApy: borrow.apy,
      rewardApyTotal: 0,
      totalApy: borrow.apy,
      rewards: [],
    };
  }
  return {
    side: "borrow",
    baseApy: breakdown.baseApy,
    rewardApyTotal: breakdown.rewardApy,
    totalApy: breakdown.totalApy,
    rewards: breakdown.rewards,
  };
};

export const defaultLendingIncentivesProvider: LendingIncentivesProvider = {
  getSupplyApyBreakdown: toSupplyBreakdown,
  getBorrowApyBreakdown: toBorrowBreakdown,
};
