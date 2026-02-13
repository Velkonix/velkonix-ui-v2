import type { Address } from "../mock";

declare global {
  interface Window {
    __VELKONIX_APP_NETWORK__?: string;
  }
}

export type SupportedNetwork = "arbitrum-sepolia";

export type AssetConfig = {
  id: string;
  address: Address;
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
};

export type AaveDeploymentConfig = {
  poolProxy: Address;
  poolAddressesProvider: Address;
  protocolDataProvider: Address;
  aaveOracle: Address;
  rewardsControllerProxy?: Address;
  uiIncentiveDataProvider?: Address;
  walletBalanceProvider?: Address;
  factoryCommit?: string;
};

export type NetworkConfig = {
  key: SupportedNetwork;
  label: string;
  chainId: number;
  explorerBaseUrl: string;
  deployments: AaveDeploymentConfig;
  assets: AssetConfig[];
};

const ARBITRUM_SEPOLIA_CONFIG: NetworkConfig = {
  key: "arbitrum-sepolia",
  label: "Arbitrum Sepolia",
  chainId: 421614,
  explorerBaseUrl: "https://sepolia.arbiscan.io",
  deployments: {
    poolProxy: "0x2102E2F0eCa7E293a0BacD343bd001a91e8fa177",
    poolAddressesProvider: "0x21574270bE1E9bb9EA21025aF1Fc58fdB3A70559",
    protocolDataProvider: "0x0079517766F55B402e24A63B12Eb20665Fa08b87",
    aaveOracle: "0x07153c7C4027EfEB4ce4Ece201FBB0b9978442ED",
    rewardsControllerProxy: "0x7D178C702DF8f1A8493d9FF959D570D3f8142D52",
    uiIncentiveDataProvider: "0x231F54f31A4B3a5BAD95A9aaECcb570488Ed75f0",
    walletBalanceProvider: "0x6283343DAba7e0d967116888849d62c50570F810",
    factoryCommit: "5c2eb37f39959dd491ba97fdc2af94bb4ee88f41",
  },
  assets: [],
};

const NETWORK_CONFIGS: Record<SupportedNetwork, NetworkConfig> = {
  "arbitrum-sepolia": ARBITRUM_SEPOLIA_CONFIG,
};

const getConfiguredNetworkKey = (): string | undefined => {
  if (typeof window !== "undefined" && typeof window.__VELKONIX_APP_NETWORK__ === "string") {
    const value = window.__VELKONIX_APP_NETWORK__.trim();
    if (value.length > 0) {
      return value;
    }
  }
  if (typeof process !== "undefined" && typeof process.env?.VITE_APP_NETWORK === "string") {
    const value = process.env.VITE_APP_NETWORK.trim();
    if (value.length > 0) {
      return value;
    }
  }
  return undefined;
};

const parseSupportedNetwork = (value: string | undefined): SupportedNetwork => {
  if (!value) {
    return "arbitrum-sepolia";
  }
  if (value in NETWORK_CONFIGS) {
    return value as SupportedNetwork;
  }
  throw new Error(
    `Unsupported VITE_APP_NETWORK="${value}". Supported values: ${Object.keys(NETWORK_CONFIGS).join(", ")}`
  );
};

const ACTIVE_NETWORK_KEY = parseSupportedNetwork(getConfiguredNetworkKey());
export const ACTIVE_NETWORK_CONFIG = NETWORK_CONFIGS[ACTIVE_NETWORK_KEY];

export const getActiveNetworkConfig = (): NetworkConfig => ACTIVE_NETWORK_CONFIG;

export const getAssetConfigByAddress = (address: Address): AssetConfig | null => {
  const normalized = address.toLowerCase();
  const match = ACTIVE_NETWORK_CONFIG.assets.find((asset) => asset.address.toLowerCase() === normalized);
  return match ?? null;
};

export const validateActiveNetworkConfig = (): string[] => {
  const missing: string[] = [];
  const { deployments } = ACTIVE_NETWORK_CONFIG;
  if (!deployments.poolProxy) missing.push("poolProxy");
  if (!deployments.poolAddressesProvider) missing.push("poolAddressesProvider");
  if (!deployments.protocolDataProvider) missing.push("protocolDataProvider");
  if (!deployments.aaveOracle) missing.push("aaveOracle");
  return missing;
};
