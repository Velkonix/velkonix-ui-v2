export type FormatNumberOptions = {
  decimals?: number;
  compact?: boolean;
  useGrouping?: boolean;
  locale?: string | string[];
};

const THOUSAND = 1_000;
const MILLION = 1_000_000;
const COMPACT_INFINITY_LIMIT = 999_000_000;

const resolveAutoDecimals = (absValue: number): number => {
  if (absValue < 1) {
    return 4;
  }
  if (absValue < 10) {
    return 2;
  }
  if (absValue < 100) {
    return 1;
  }
  return 0;
};

const normalizeDecimals = (decimals: number | undefined): number | undefined => {
  if (typeof decimals !== "number" || !Number.isFinite(decimals)) {
    return undefined;
  }
  return Math.max(0, Math.floor(decimals));
};

export const formatNumber = (value: number, options: FormatNumberOptions = {}): string => {
  if (Number.isNaN(value)) {
    return "0";
  }
  if (!Number.isFinite(value)) {
    return value < 0 ? "-∞" : "∞";
  }

  const compact = options.compact ?? true;
  const useGrouping = options.useGrouping ?? true;
  const normalizedDecimals = normalizeDecimals(options.decimals);
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue === 0) {
    return "0";
  }

  if (compact && absValue > COMPACT_INFINITY_LIMIT) {
    return `${sign}∞`;
  }

  let scaledValue = absValue;
  let suffix = "";

  if (compact && absValue >= MILLION) {
    scaledValue = absValue / MILLION;
    suffix = "M";
  } else if (compact && absValue >= THOUSAND) {
    scaledValue = absValue / THOUSAND;
    suffix = "K";
  }

  const decimals = normalizedDecimals ?? resolveAutoDecimals(scaledValue);
  const formatted = scaledValue.toLocaleString(options.locale ?? "en-US", {
    useGrouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${sign}${formatted}${suffix}`;
};
