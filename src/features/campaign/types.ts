export type LeaderboardRow = {
  rank: number;
  address: string;
  minSupplyUsd: bigint;
  minBorrowUsd: bigint;
  weeklyPoints: bigint;
  cumulativePoints: bigint;
};

export type LeaderboardSnapshot = {
  week: number;
  weekStart: number;
  weekEnd: number;
  finalizedAt: string;
  totalPoints: bigint;
  rows: LeaderboardRow[];
};

export type UserProof = {
  address: string;
  amount: bigint;
  proof: `0x${string}`[];
  root: `0x${string}`;
};

export type WeekOverview = {
  rank: number;
  minSupplyUsd: bigint;
  minBorrowUsd: bigint;
  weeklyPoints: bigint;
  cumulativePoints: bigint;
  share: number;
  tokens: bigint;
};

export type CampaignTab = "leaderboard" | "overview" | "rules";

export type CampaignStatus = "Upcoming" | "Active" | "Ended";
