import { useEffect, useMemo, useState } from "react";

import { getActiveNetworkConfig } from "../../config/networks";

const RAY = 10n ** 27n;
const SECONDS_PER_DAY = 86_400;

type HistoryItemRaw = {
  timestamp: number;
  liquidityRate: string;
  variableBorrowRate: string;
  utilizationRate: string;
  totalLiquidity: string;
  totalCurrentVariableDebt: string;
  priceInUsd: string;
  reserve: {
    underlyingAsset: string;
    decimals: number;
    symbol: string;
  };
};

export type ReserveHistoryPoint = {
  timestamp: number;
  date: number;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  totalLiquidity: number;
  totalDebt: number;
  totalLiquidityUsd: number;
  totalBorrowedUsd: number;
  priceUsd: number;
};

export type AggregatedHistoryPoint = {
  timestamp: number;
  date: number;
  totalSuppliedUsd: number;
  totalBorrowedUsd: number;
};

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

const rayToPercent = (raw: string): number => {
  try {
    return Number((BigInt(raw) * 10_000n) / RAY) / 100;
  } catch {
    return 0;
  }
};

const formatTokenUnits = (raw: string, decimals: number): number => {
  try {
    const big = BigInt(raw);
    if (decimals <= 0) return Number(big);
    const base = 10n ** BigInt(Math.min(decimals, 18));
    if (decimals <= 18) return Number(big) / Number(base);
    const trimmed = big / 10n ** BigInt(decimals - 18);
    return Number(trimmed) / 1e18;
  } catch {
    return 0;
  }
};

const safeNumber = (value: string): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toReserveHistoryPoint = (item: HistoryItemRaw): ReserveHistoryPoint => {
  const decimals = item.reserve.decimals;
  const totalLiquidity = formatTokenUnits(item.totalLiquidity, decimals);
  const totalDebt = formatTokenUnits(item.totalCurrentVariableDebt, decimals);
  const priceUsd = safeNumber(item.priceInUsd);
  return {
    timestamp: item.timestamp,
    date: item.timestamp * 1000,
    supplyApy: rayToPercent(item.liquidityRate),
    borrowApy: rayToPercent(item.variableBorrowRate),
    utilization: safeNumber(item.utilizationRate) * 100,
    totalLiquidity,
    totalDebt,
    totalLiquidityUsd: totalLiquidity * priceUsd,
    totalBorrowedUsd: totalDebt * priceUsd,
    priceUsd,
  };
};

async function gqlFetch<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`SUBGRAPH_HTTP_${res.status}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`SUBGRAPH_GQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("SUBGRAPH_EMPTY_RESPONSE");
  }
  return json.data;
}

const RESERVE_HISTORY_QUERY = /* GraphQL */ `
  query ReserveHistory($underlying: Bytes!, $since: Int!) {
    reserveParamsHistoryItems(
      where: { reserve_: { underlyingAsset: $underlying }, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
    ) {
      timestamp
      liquidityRate
      variableBorrowRate
      utilizationRate
      totalLiquidity
      totalCurrentVariableDebt
      priceInUsd
      reserve {
        underlyingAsset
        decimals
        symbol
      }
    }
  }
`;

const ALL_HISTORY_QUERY = /* GraphQL */ `
  query AllReservesHistory($since: Int!, $skip: Int!) {
    reserveParamsHistoryItems(
      where: { timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: asc
      first: 1000
      skip: $skip
    ) {
      timestamp
      liquidityRate
      variableBorrowRate
      utilizationRate
      totalLiquidity
      totalCurrentVariableDebt
      priceInUsd
      reserve {
        underlyingAsset
        decimals
        symbol
      }
    }
  }
`;

export async function fetchReserveHistory(
  underlyingAsset: string,
  days: number
): Promise<ReserveHistoryPoint[]> {
  const url = getActiveNetworkConfig().subgraphUrl;
  if (!url) throw new Error("SUBGRAPH_URL_NOT_CONFIGURED");
  const since = Math.floor(Date.now() / 1000) - days * SECONDS_PER_DAY;
  const data = await gqlFetch<{ reserveParamsHistoryItems: HistoryItemRaw[] }>(
    url,
    RESERVE_HISTORY_QUERY,
    { underlying: underlyingAsset.toLowerCase(), since }
  );
  return data.reserveParamsHistoryItems.map(toReserveHistoryPoint);
}

export async function fetchAllReservesHistory(days: number): Promise<ReserveHistoryPoint[]> {
  const url = getActiveNetworkConfig().subgraphUrl;
  if (!url) throw new Error("SUBGRAPH_URL_NOT_CONFIGURED");
  const since = Math.floor(Date.now() / 1000) - days * SECONDS_PER_DAY;
  const collected: HistoryItemRaw[] = [];
  // Page until we get fewer than 1000 entries (or hit a safety cap).
  for (let skip = 0; skip < 6000; skip += 1000) {
    const data = await gqlFetch<{ reserveParamsHistoryItems: HistoryItemRaw[] }>(
      url,
      ALL_HISTORY_QUERY,
      { since, skip }
    );
    const items = data.reserveParamsHistoryItems;
    collected.push(...items);
    if (items.length < 1000) break;
  }
  return collected.map(toReserveHistoryPoint);
}

type KeyedHistoryPoint = ReserveHistoryPoint & { underlyingAsset: string };

const toKeyedHistoryPoint = (item: HistoryItemRaw): KeyedHistoryPoint => ({
  ...toReserveHistoryPoint(item),
  underlyingAsset: item.reserve.underlyingAsset.toLowerCase(),
});

export async function fetchAggregatedHistory(days: number): Promise<AggregatedHistoryPoint[]> {
  const url = getActiveNetworkConfig().subgraphUrl;
  if (!url) throw new Error("SUBGRAPH_URL_NOT_CONFIGURED");
  const since = Math.floor(Date.now() / 1000) - days * SECONDS_PER_DAY;
  const collected: HistoryItemRaw[] = [];
  for (let skip = 0; skip < 6000; skip += 1000) {
    const data = await gqlFetch<{ reserveParamsHistoryItems: HistoryItemRaw[] }>(
      url,
      ALL_HISTORY_QUERY,
      { since, skip }
    );
    collected.push(...data.reserveParamsHistoryItems);
    if (data.reserveParamsHistoryItems.length < 1000) break;
  }
  const keyed = collected.map(toKeyedHistoryPoint);
  // Bucket by day, keep latest sample per reserve per day, then sum.
  const dayBuckets = new Map<number, Map<string, KeyedHistoryPoint>>();
  for (const point of keyed) {
    const dayKey = Math.floor(point.timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
    let bucket = dayBuckets.get(dayKey);
    if (!bucket) {
      bucket = new Map();
      dayBuckets.set(dayKey, bucket);
    }
    const existing = bucket.get(point.underlyingAsset);
    if (!existing || existing.timestamp < point.timestamp) {
      bucket.set(point.underlyingAsset, point);
    }
  }
  // Forward-fill: keep last seen per-reserve value across days even if absent.
  const sortedDayKeys = [...dayBuckets.keys()].sort((a, b) => a - b);
  const lastByReserve = new Map<string, KeyedHistoryPoint>();
  const result: AggregatedHistoryPoint[] = [];
  for (const dayKey of sortedDayKeys) {
    const bucket = dayBuckets.get(dayKey)!;
    for (const [key, point] of bucket) {
      lastByReserve.set(key, point);
    }
    let totalSupplied = 0;
    let totalBorrowed = 0;
    for (const point of lastByReserve.values()) {
      totalSupplied += point.totalLiquidityUsd;
      totalBorrowed += point.totalBorrowedUsd;
    }
    result.push({
      timestamp: dayKey,
      date: dayKey * 1000,
      totalSuppliedUsd: totalSupplied,
      totalBorrowedUsd: totalBorrowed,
    });
  }
  return result;
}

const initialState = <T>(): FetchState<T> => ({ data: null, loading: true, error: null });

export function useReserveHistory(
  underlyingAsset: string | undefined,
  days: number = 30
): FetchState<ReserveHistoryPoint[]> {
  const [state, setState] = useState<FetchState<ReserveHistoryPoint[]>>(initialState);
  useEffect(() => {
    if (!underlyingAsset) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fetchReserveHistory(underlyingAsset, days)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [underlyingAsset, days]);
  return state;
}

export function useAggregatedHistory(days: number = 30): FetchState<AggregatedHistoryPoint[]> {
  const [state, setState] = useState<FetchState<AggregatedHistoryPoint[]>>(initialState);
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fetchAggregatedHistory(days)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [days]);
  return state;
}

export function useSupplyApySeries(
  underlyingAsset: string | undefined,
  days: number = 30
): { data: Array<{ date: number; value: number }>; loading: boolean; error: string | null } {
  const { data, loading, error } = useReserveHistory(underlyingAsset, days);
  const series = useMemo(
    () => (data ? data.map((p) => ({ date: p.date, value: p.supplyApy })) : []),
    [data]
  );
  return { data: series, loading, error };
}

export function useBorrowApySeries(
  underlyingAsset: string | undefined,
  days: number = 30
): { data: Array<{ date: number; value: number }>; loading: boolean; error: string | null } {
  const { data, loading, error } = useReserveHistory(underlyingAsset, days);
  const series = useMemo(
    () => (data ? data.map((p) => ({ date: p.date, value: p.borrowApy })) : []),
    [data]
  );
  return { data: series, loading, error };
}
