import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";
import type { Chain } from "viem";

import type { Address } from "../domain/types";

declare global {
  interface Window {
    __VELKONIX_APP_NETWORK__?: string;
    __VELKONIX_MEGAETH_SUBGRAPH_URL__?: string;
  }
}

export type SupportedNetwork = "megaeth-mainnet" | "arbitrum-sepolia";

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
  uiPoolDataProvider?: Address;
  uiIncentiveDataProvider?: Address;
  walletBalanceProvider?: Address;
  factoryCommit?: string;
};

export type StakingDeploymentConfig = {
  staking: Address | "";
  rewardsDistributor: Address | "";
  velk: Address | "";
  xvelk: Address | "";
};

export type CampaignDeploymentConfig = {
  rewardToken: Address | "";
  distributor: Address | "";
  snapshotsBaseUrl: string;
  campaignStartTs: number;
  campaignWeeks: number;
};

export type NetworkConfig = {
  key: SupportedNetwork;
  label: string;
  chainId: number;
  explorerBaseUrl: string;
  viemChain: Chain;
  rpcUrl: string;
  subgraphUrl?: string;
  deployments: AaveDeploymentConfig;
  staking: StakingDeploymentConfig;
  campaign: CampaignDeploymentConfig;
  assets: AssetConfig[];
};

const MEGAETH_DEFAULT_RPC_URL = "https://mainnet.megaeth.com/rpc";
const MEGAETH_EXPLORER_URL = "https://megaeth.blockscout.com";
const MEGAETH_DEFAULT_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmq51h6qmx8qq01rehav1eu2o/subgraphs/velkonix-v3-megaeth/1.0.0/gn";

const getMegaethSubgraphUrl = (): string | undefined => {
  if (
    typeof window !== "undefined" &&
    typeof window.__VELKONIX_MEGAETH_SUBGRAPH_URL__ === "string"
  ) {
    const value = window.__VELKONIX_MEGAETH_SUBGRAPH_URL__.trim();
    if (value.length > 0) return value;
  }
  if (
    typeof process !== "undefined" &&
    typeof process.env?.VITE_MEGAETH_SUBGRAPH_URL === "string"
  ) {
    const value = process.env.VITE_MEGAETH_SUBGRAPH_URL.trim();
    if (value.length > 0) return value;
  }
  return MEGAETH_DEFAULT_SUBGRAPH_URL;
};

export const MEGAETH_MAINNET_CHAIN = defineChain({
  id: 4326,
  name: "MegaETH",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [MEGAETH_DEFAULT_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: MEGAETH_EXPLORER_URL },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
});

const MEGAETH_MAINNET_CONFIG: NetworkConfig = {
  key: "megaeth-mainnet",
  label: "MegaETH",
  chainId: 4326,
  explorerBaseUrl: MEGAETH_EXPLORER_URL,
  viemChain: MEGAETH_MAINNET_CHAIN,
  rpcUrl: MEGAETH_DEFAULT_RPC_URL,
  subgraphUrl: getMegaethSubgraphUrl(),
  deployments: {
    poolAddressesProvider: "0x4E293100F46889B21a12C5884551FF340AD8d7b9",
    poolProxy: "0x202FC1FEf70C8a7001f1579518e9288A547C12Ee",
    aaveOracle: "0xfE7FCB1814Cb025149a938eDC85CE28BC71ce836",
    protocolDataProvider: "0x6da56B769B42952CACA18D37Feda3015FDB2fE67",
    rewardsControllerProxy: "0xe243175aB6c779f9cFE8780B45e98752db8a8E79",
    uiPoolDataProvider: "0x4f9ba5CaE0e3F651821283EC4e303fE8D1dA542a",
    uiIncentiveDataProvider: "0x80Efb6394E142F778cdD7F59b6Ee484B5a6299EB",
    walletBalanceProvider: "0xE53969561603a9052E3F579b2992C12F3C783496",
  },
  staking: {
    // TODO: fill in after deploying the Velkonix staking stack on MegaETH.
    staking: "",
    rewardsDistributor: "",
    velk: "",
    xvelk: "",
  },
  campaign: {
    // PREVIEW: pointed at the live K613 mainnet snapshots so the leaderboard /
    // overview render real data. Swap rewardToken + distributor + snapshotsBaseUrl
    // for the Velkonix MegaETH deployment when ready. NOTE: the distributor below
    // lives on the K613 chain, not MegaETH — claim reads will no-op here, so the
    // Claim card stays hidden until a MegaETH distributor is set.
    rewardToken: "0x4f9ba5CaE0e3F651821283EC4e303fE8D1dA542a",
    distributor: "0x94F71Da72c6CE71c570CF7F8e076F3097E411063",
    snapshotsBaseUrl:
      "https://raw.githubusercontent.com/K613-Official/K613-points/main/snapshots-mainnet",
    campaignStartTs: 1779321600,
    campaignWeeks: 4,
  },
  assets: [
    {
      id: "weth",
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      name: "Wrapped Ether",
      icon: "weth",
      decimals: 18,
    },
    {
      id: "wsteth",
      address: "0x601aC63637933D88285A025C685AC4e9a92a98dA",
      symbol: "wstETH",
      name: "Lido Staked Ether",
      icon: "wsteth",
      decimals: 18,
    },
    {
      id: "btcb",
      address: "0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072",
      symbol: "BTC.b",
      name: "Bitcoin Bridge",
      icon: "btc",
      decimals: 8,
    },
    {
      id: "usdt0",
      address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
      symbol: "USDT0",
      name: "Tether USD",
      icon: "usdt0",
      decimals: 6,
    },
    {
      id: "usde",
      address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
      symbol: "USDe",
      name: "Ethena USDe",
      icon: "usde",
      decimals: 18,
    },
    {
      id: "usdm",
      address: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
      symbol: "USDm",
      name: "Velkonix USD",
      icon: "usdm",
      decimals: 18,
    },
  ],
};

const ARBITRUM_SEPOLIA_CONFIG: NetworkConfig = {
  key: "arbitrum-sepolia",
  label: "Arbitrum Sepolia",
  chainId: 421614,
  explorerBaseUrl: "https://sepolia.arbiscan.io",
  viemChain: arbitrumSepolia,
  rpcUrl: arbitrumSepolia.rpcUrls.default.http[0],
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
  staking: {
    staking: "",
    rewardsDistributor: "",
    velk: "",
    xvelk: "",
  },
  campaign: {
    rewardToken: "",
    distributor: "",
    snapshotsBaseUrl:
      "https://raw.githubusercontent.com/Velkonix/velkonix-points/main/snapshots-testnet",
    campaignStartTs: 1778963398,
    campaignWeeks: 4,
  },
  assets: [],
};

const NETWORK_CONFIGS: Record<SupportedNetwork, NetworkConfig> = {
  "megaeth-mainnet": MEGAETH_MAINNET_CONFIG,
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
    return "megaeth-mainnet";
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
  const match = ACTIVE_NETWORK_CONFIG.assets.find(
    (asset) => asset.address.toLowerCase() === normalized
  );
  return match ?? null;
};

export const validateActiveNetworkConfig = (): string[] => {
  const missing: string[] = [];
  const { deployments, key } = ACTIVE_NETWORK_CONFIG;
  if (!deployments.poolProxy) missing.push("poolProxy");
  if (!deployments.poolAddressesProvider) missing.push("poolAddressesProvider");
  if (!deployments.aaveOracle) missing.push("aaveOracle");
  if (key === "megaeth-mainnet") {
    if (!deployments.uiPoolDataProvider) missing.push("uiPoolDataProvider");
    if (!deployments.uiIncentiveDataProvider) missing.push("uiIncentiveDataProvider");
    if (!deployments.walletBalanceProvider) missing.push("walletBalanceProvider");
  } else {
    if (!deployments.protocolDataProvider) missing.push("protocolDataProvider");
  }
  return missing;
};

export const validateActiveStakingConfig = (): string[] => {
  const missing: string[] = [];
  const { staking } = ACTIVE_NETWORK_CONFIG;
  if (!staking.staking) missing.push("staking");
  if (!staking.rewardsDistributor) missing.push("rewardsDistributor");
  if (!staking.velk) missing.push("velk");
  if (!staking.xvelk) missing.push("xvelk");
  return missing;
};

export const isStakingConfigured = (): boolean => validateActiveStakingConfig().length === 0;

export const getActiveCampaignConfig = (): CampaignDeploymentConfig =>
  ACTIVE_NETWORK_CONFIG.campaign;

// The leaderboard/overview tabs only need a snapshots URL; claiming additionally
// needs the on-chain merkle distributor. Use this to gate the Claim section.
export const isCampaignClaimConfigured = (): boolean =>
  Boolean(ACTIVE_NETWORK_CONFIG.campaign.distributor);
