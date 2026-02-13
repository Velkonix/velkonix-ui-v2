const RAY = 10 ** 27;

export const formatUnitsToNumber = (value: bigint, decimals: number): number => {
  if (decimals <= 0) {
    return Number(value);
  }
  const base = 10 ** Math.min(decimals, 18);
  if (decimals <= 18) {
    return Number(value) / base;
  }
  const trimmed = value / BigInt(10 ** (decimals - 18));
  return Number(trimmed) / 10 ** 18;
};

export const parseAmountToUnits = (amount: number, decimals: number): bigint => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0n;
  }
  const safeDecimals = Math.min(Math.max(decimals, 0), 18);
  const factor = 10 ** safeDecimals;
  const scaled = Math.floor(amount * factor);
  if (decimals <= 18) {
    return BigInt(scaled);
  }
  return BigInt(scaled) * BigInt(10 ** (decimals - 18));
};

export const rayToPercent = (value: bigint): number => (Number(value) / RAY) * 100;

export const bpsToPercent = (bps: bigint): number => Number(bps) / 100;
