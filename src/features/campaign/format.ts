const numberFormatter = new Intl.NumberFormat("en-US");

const USD_DECIMALS = 18n;
const POINTS_DECIMALS = 18n;
const TOKEN_DECIMALS = 18n;

const pow10 = (decimals: bigint): bigint => BigInt("1" + "0".repeat(Number(decimals)));

const formatBaseUnits = (value: bigint, decimals: bigint, fractionDigits = 2): string => {
  const divisor = pow10(decimals);
  if (fractionDigits <= 0) {
    const rounded = (value + divisor / 2n) / divisor;
    return numberFormatter.format(Number(rounded));
  }
  const scale = pow10(BigInt(fractionDigits));
  const scaled = (value * scale + divisor / 2n) / divisor;
  const integer = scaled / scale;
  const fraction = scaled % scale;
  const integerStr = numberFormatter.format(Number(integer));
  const fractionStr = fraction.toString().padStart(fractionDigits, "0");
  return `${integerStr}.${fractionStr}`;
};

export const formatUsd = (value: bigint): string => formatBaseUnits(value, USD_DECIMALS, 2);

export const formatPoints = (value: bigint): string => formatBaseUnits(value, POINTS_DECIMALS, 2);

export const formatShare = (share: number): string => `${(share * 100).toFixed(2)}%`;

export const shortenAddress = (address: string): string => {
  if (!address || address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

export const formatTokens = (value: bigint): string => {
  if (value === 0n) return "0";
  const divisor = pow10(TOKEN_DECIMALS);
  const integer = value / divisor;
  const fraction = value % divisor;
  const integerStr = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === 0n) return integerStr;
  const fractionStr = fraction
    .toString()
    .padStart(Number(TOKEN_DECIMALS), "0")
    .slice(0, 4)
    .replace(/0+$/, "");
  return fractionStr ? `${integerStr}.${fractionStr}` : integerStr;
};
