import { useEffect, useState } from "react";

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
