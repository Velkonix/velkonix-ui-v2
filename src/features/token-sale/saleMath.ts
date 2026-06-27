import type { SaleSchedule, SaleStageKey } from "./types";

export const USDC_DECIMALS = 6n;
export const TOKEN_DECIMALS = 18n;

const pow10 = (decimals: bigint): bigint => BigInt("1" + "0".repeat(Number(decimals)));

const USDC_ONE = pow10(USDC_DECIMALS);
const USDC_TO_TOKEN_SCALE = pow10(TOKEN_DECIMALS - USDC_DECIMALS);

export const HARD_CAP_USDC = 100_000n * USDC_ONE;
export const SALE_ALLOCATION_TOKEN = 10_000_000n * pow10(TOKEN_DECIMALS);

export function getTokenPriceUsd(hardCap6: bigint, saleAllocation18: bigint): number {
  if (saleAllocation18 <= 0n) return 0;
  const PRICE_PRECISION = 1_000_000n;
  const scaled = (hardCap6 * USDC_TO_TOKEN_SCALE * PRICE_PRECISION) / saleAllocation18;
  return Number(scaled) / Number(PRICE_PRECISION);
}

export function getAllocation(
  deposit6: bigint,
  total6: bigint,
  hardCap6: bigint,
  saleAllocation18: bigint
): bigint {
  if (deposit6 <= 0n || hardCap6 <= 0n || saleAllocation18 <= 0n) return 0n;
  const denominator = total6 > hardCap6 ? total6 : hardCap6;
  return (deposit6 * saleAllocation18) / denominator;
}

export function getUsedFunds(
  allocation18: bigint,
  hardCap6: bigint,
  saleAllocation18: bigint
): bigint {
  if (saleAllocation18 <= 0n) return 0n;
  return (allocation18 * hardCap6) / saleAllocation18;
}

export function getRefund(
  deposit6: bigint,
  total6: bigint,
  hardCap6: bigint,
  saleAllocation18: bigint
): bigint {
  const used6 = getUsedFunds(
    getAllocation(deposit6, total6, hardCap6, saleAllocation18),
    hardCap6,
    saleAllocation18
  );
  return deposit6 > used6 ? deposit6 - used6 : 0n;
}

export function getPoolShare(deposit6: bigint, total6: bigint): number {
  if (total6 <= 0n || deposit6 <= 0n) return 0;
  return Number((deposit6 * 1_000_000n) / total6) / 1_000_000;
}

export function getOversubscription(total6: bigint, hardCap6: bigint): number {
  if (hardCap6 <= 0n) return 0;
  return Number((total6 * 1_000_000n) / hardCap6) / 1_000_000;
}

export function getAllocationRatio(total6: bigint, hardCap6: bigint): number {
  if (hardCap6 <= 0n || total6 <= hardCap6) return 1;
  return Number((hardCap6 * 10_000n) / total6) / 10_000;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatBaseUnits(value: bigint, decimals: bigint, fractionDigits: number): string {
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
}

export function formatUsdc(value6: bigint, fractionDigits = 2): string {
  return `$${formatBaseUnits(value6, USDC_DECIMALS, fractionDigits)}`;
}

export function formatToken(value18: bigint, fractionDigits = 2): string {
  return formatBaseUnits(value18, TOKEN_DECIMALS, fractionDigits);
}

export function formatShare(share: number): string {
  return `${(share * 100).toFixed(2)}%`;
}

export function formatTokenPriceUsd(hardCap6: bigint, saleAllocation18: bigint): string {
  const price = getTokenPriceUsd(hardCap6, saleAllocation18);
  const text = price.toFixed(6).replace(/\.?0+$/, "");
  return `$${text}`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function parseUsdcInput(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return null;
  const [integerPart = "", fractionPart = ""] = trimmed.split(".");
  const fraction = fractionPart.slice(0, Number(USDC_DECIMALS)).padEnd(Number(USDC_DECIMALS), "0");
  try {
    return BigInt(integerPart || "0") * USDC_ONE + BigInt(fraction || "0");
  } catch {
    return null;
  }
}

export function usdcToInputValue(value6: bigint): string {
  const integer = value6 / USDC_ONE;
  const fraction = value6 % USDC_ONE;
  if (fraction === 0n) return integer.toString();
  const fractionStr = fraction.toString().padStart(Number(USDC_DECIMALS), "0").replace(/0+$/, "");
  return `${integer.toString()}.${fractionStr}`;
}

export const STAGE_ORDER: SaleStageKey[] = [
  "upcoming",
  "contribution",
  "closed",
  "finalized",
  "claim",
];

export const STAGE_LABELS: Record<SaleStageKey, string> = {
  upcoming: "Upcoming",
  contribution: "Contribution Open",
  closed: "Sale Closed",
  finalized: "Allocation Finalized",
  claim: "Claim Open",
};

export function getCurrentStage(schedule: SaleSchedule, nowMs: number): SaleStageKey {
  if (nowMs < schedule.saleStartMs) return "upcoming";
  if (nowMs < schedule.saleEndMs) return "contribution";
  if (!schedule.finalized) return "closed";
  if (schedule.claimStartMs === 0 || nowMs >= schedule.claimStartMs) return "claim";
  return "finalized";
}

export function isClaimWindowClosed(schedule: SaleSchedule, nowMs: number): boolean {
  return schedule.finalized && schedule.claimDeadlineMs > 0 && nowMs >= schedule.claimDeadlineMs;
}

export type StageStatus = "completed" | "active" | "pending";

export function getStageStatus(stage: SaleStageKey, current: SaleStageKey): StageStatus {
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const currentIndex = STAGE_ORDER.indexOf(current);
  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

export function getCountdownLabel(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function formatDateTimeUtc(ms: number): string {
  if (!Number.isFinite(ms) || ms === 0) return "TBA";
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(ms);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(ms);
  return `${date} ${time} (UTC)`;
}
