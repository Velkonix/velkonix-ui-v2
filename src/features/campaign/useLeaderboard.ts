import { useCallback, useEffect, useState } from "react";

import { getCampaignConfig } from "../../config/networks";
import { fetchLeaderboard } from "./snapshotsClient";
import type { LeaderboardSnapshot } from "./types";

type LeaderboardState = {
  data: LeaderboardSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

const cache = new Map<string, LeaderboardSnapshot | null>();

export function useLeaderboard(week: number) {
  const baseUrl = getCampaignConfig().snapshotsBaseUrl;
  const cacheKey = `${baseUrl}::${week}`;

  const [state, setState] = useState<LeaderboardState>(() => ({
    data: cache.get(cacheKey) ?? null,
    isLoading: Boolean(baseUrl) && !cache.has(cacheKey),
    isError: false,
    error: null,
  }));

  const load = useCallback(
    async (force = false) => {
      if (!baseUrl) {
        setState({ data: null, isLoading: false, isError: false, error: null });
        return;
      }
      if (force) cache.delete(cacheKey);
      setState((prev) => ({ ...prev, isLoading: true, isError: false, error: null }));
      try {
        const data = await fetchLeaderboard(baseUrl, week);
        cache.set(cacheKey, data);
        setState({ data, isLoading: false, isError: false, error: null });
      } catch (error) {
        setState({ data: null, isLoading: false, isError: true, error });
      }
    },
    [baseUrl, week, cacheKey]
  );

  useEffect(() => {
    if (!baseUrl) {
      setState({ data: null, isLoading: false, isError: false, error: null });
      return;
    }
    if (cache.has(cacheKey)) {
      setState({
        data: cache.get(cacheKey) ?? null,
        isLoading: false,
        isError: false,
        error: null,
      });
      return;
    }
    let ignore = false;
    setState((prev) => ({ ...prev, isLoading: true, isError: false, error: null }));
    fetchLeaderboard(baseUrl, week)
      .then((data) => {
        cache.set(cacheKey, data);
        if (!ignore) setState({ data, isLoading: false, isError: false, error: null });
      })
      .catch((error) => {
        if (!ignore) setState({ data: null, isLoading: false, isError: true, error });
      });
    return () => {
      ignore = true;
    };
  }, [baseUrl, week, cacheKey]);

  return { ...state, refetch: () => load(true) };
}
