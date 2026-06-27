export type SaleStageKey = "upcoming" | "contribution" | "closed" | "finalized" | "claim";

export type SaleSchedule = {
  saleStartMs: number;
  saleEndMs: number;
  claimStartMs: number;
  claimDeadlineMs: number;
  finalized: boolean;
};

export type SaleAction = "approve" | "deposit" | "claimTokens" | "claimRefund";

export type SaleStats = {
  totalDeposited: bigint;
  participantCount: number;
  hardCap: bigint;
  saleAllocation: bigint;
  totalTokensSold: bigint;
};

export type UserSaleState = {
  deposit: bigint;
  usdcBalance: bigint;
  usdcAllowance: bigint;
  tokensClaimed: boolean;
  refundClaimed: boolean;
  finalAllocation: bigint | null;
  finalRefund: bigint | null;
  claimableTokens: bigint;
  claimableRefund: bigint;
};
