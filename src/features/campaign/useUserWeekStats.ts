import { useMemo } from "react";

import type { WeekOverview } from "./types";
import { useLeaderboard } from "./useLeaderboard";

export function useUserWeekStats(week: number, address: string | undefined) {
  const query = useLeaderboard(week);

  const data = useMemo<WeekOverview | null>(() => {
    if (!query.data || !address) return null;
    const target = address.toLowerCase();
    const row = query.data.rows.find((r) => r.address.toLowerCase() === target);
    if (!row) return null;
    const total = query.data.totalPoints;
    const share = total > 0n ? Number((row.weeklyPoints * 10_000n) / total) / 10_000 : 0;
    return {
      rank: row.rank,
      minSupplyUsd: row.minSupplyUsd,
      minBorrowUsd: row.minBorrowUsd,
      weeklyPoints: row.weeklyPoints,
      cumulativePoints: row.cumulativePoints,
      share,
      tokens: row.weeklyPoints,
    };
  }, [query.data, address]);

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
