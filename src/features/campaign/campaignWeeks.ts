import type { CampaignDeploymentConfig } from "../../config/networks";
import type { CampaignStatus } from "./types";

const WEEK_MS = 7 * 86_400_000;

const startMs = (config: CampaignDeploymentConfig): number => config.campaignStartTs * 1000;

export const getTotalWeeks = (config: CampaignDeploymentConfig): number =>
  Math.max(1, config.campaignWeeks);

export const getUnlockedWeek = (config: CampaignDeploymentConfig, now = Date.now()): number => {
  const start = startMs(config);
  if (!Number.isFinite(start) || start === 0 || now < start) return 1;
  const idx = Math.floor((now - start) / WEEK_MS) + 1;
  return Math.min(Math.max(idx, 1), getTotalWeeks(config));
};

export const getAvailableWeeks = (config: CampaignDeploymentConfig, now = Date.now()): number[] => {
  const unlocked = getUnlockedWeek(config, now);
  const weeks: number[] = [];
  for (let i = 1; i <= unlocked; i += 1) weeks.push(i);
  return weeks;
};

export const getCountdownLabel = (
  config: CampaignDeploymentConfig,
  week: number,
  now = Date.now()
): string => {
  const weekEnd = startMs(config) + week * WEEK_MS;
  const diff = Math.max(0, weekEnd - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${days}d ${hours}h ${minutes}m`;
};

export const getCampaignStatus = (
  config: CampaignDeploymentConfig,
  now = Date.now()
): CampaignStatus => {
  const start = startMs(config);
  if (!Number.isFinite(start) || start === 0) return "Active";
  const endMs = start + getTotalWeeks(config) * WEEK_MS;
  if (now < start) return "Upcoming";
  if (now >= endMs) return "Ended";
  return "Active";
};

export const getCampaignDatesLabel = (config: CampaignDeploymentConfig): string => {
  const start = startMs(config);
  if (!Number.isFinite(start) || start === 0) return "";
  const endMs = start + getTotalWeeks(config) * WEEK_MS;
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(start)} - ${fmt.format(endMs)}`;
};

export const getLastUpdatedLabel = (finalizedAt?: string): string => {
  if (!finalizedAt) return "Not finalized yet";
  const ms = Date.parse(finalizedAt);
  if (Number.isNaN(ms)) return "Not finalized yet";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(ms);
  return `Last updated ${formatted} UTC`;
};
