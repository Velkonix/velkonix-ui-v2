export type ChartPeriod = "week" | "month" | "year" | "max";

export type TimeSeriesPoint = {
  date: Date | number | string;
  value: number;
};

export type NormalizedTimeSeriesPoint = {
  timestamp: number;
  date: Date;
  value: number;
};

export const DEFAULT_PERIODS: ChartPeriod[] = ["week", "month", "year", "max"];

export function normalizeTimeSeries(data: TimeSeriesPoint[]): NormalizedTimeSeriesPoint[] {
  return data
    .map((point) => {
      const date = new Date(point.date);
      const timestamp = date.getTime();
      if (!Number.isFinite(timestamp) || !Number.isFinite(point.value)) {
        return null;
      }
      return {
        timestamp,
        date,
        value: point.value,
      };
    })
    .filter((point): point is NormalizedTimeSeriesPoint => point !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function getPeriodStart(period: ChartPeriod, endTimestamp: number): number {
  const dayMs = 24 * 60 * 60 * 1000;
  if (period === "week") {
    return endTimestamp - 7 * dayMs;
  }
  if (period === "month") {
    return endTimestamp - 30 * dayMs;
  }
  if (period === "year") {
    return endTimestamp - 365 * dayMs;
  }
  return Number.NEGATIVE_INFINITY;
}

export function filterByPeriod(
  points: NormalizedTimeSeriesPoint[],
  period: ChartPeriod
): NormalizedTimeSeriesPoint[] {
  if (period === "max" || points.length === 0) {
    return points;
  }
  const endTimestamp = points[points.length - 1].timestamp;
  const startTimestamp = getPeriodStart(period, endTimestamp);
  const filtered = points.filter((point) => point.timestamp >= startTimestamp);
  return filtered.length > 0 ? filtered : [points[points.length - 1]];
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateLabel(date: Date, period: ChartPeriod): string {
  if (period === "week" || period === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
  }).format(date);
}

export function getValueDomain(points: NormalizedTimeSeriesPoint[]): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }
  let min = points[0].value;
  let max = points[0].value;
  for (const point of points) {
    if (point.value < min) {
      min = point.value;
    }
    if (point.value > max) {
      max = point.value;
    }
  }
  if (min === max) {
    const offset = min === 0 ? 1 : Math.abs(min * 0.1);
    return [min - offset, max + offset];
  }
  const padding = (max - min) * 0.12;
  return [min - padding, max + padding];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
