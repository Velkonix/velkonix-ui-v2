import type { Address } from "../types/contracts";
import type { Asset } from "../types/contracts";
import type { MockDbState, MockUserState } from "../types/state";

const STORAGE_KEY = "mock.db.state";
const DEFAULT_ADDRESS = "0x000000000000000000000000000000000000dEaD" as Address;

const createDefaultAssets = (): Asset[] => [
  {
    id: "USDC",
    symbol: "USDC",
    name: "USD Coin",
    icon: "usdc",
    totalSupplied: 1_250_000,
    totalBorrowed: 410_000,
    supplyApy: 4.2,
    borrowApy: 6.7,
  },
  {
    id: "WETH",
    symbol: "WETH",
    name: "Wrapped Ether",
    icon: "weth",
    totalSupplied: 5_100,
    totalBorrowed: 1_680,
    supplyApy: 2.4,
    borrowApy: 3.8,
  },
  {
    id: "VELK",
    symbol: "VELK",
    name: "Velkonix Token",
    icon: "velk",
    totalSupplied: 800_000,
    totalBorrowed: 0,
    supplyApy: 0,
    borrowApy: 0,
  },
];

const createDefaultUser = (): MockUserState => ({
  balances: {
    USDC: 25_000,
    WETH: 12,
    VELK: 50_000,
  },
  allowances: {},
  supplies: [],
  borrows: [],
  lendingRewards: 0,
  staking: {
    velkBalance: 50_000,
    xVelkBalance: 0,
    staked: 0,
    rewards: 0,
    apr: 18.5,
    lockDurationMs: 90 * 24 * 60 * 60 * 1000,
    instantExitPenaltyBps: 3000,
    depositTimestamp: 0,
    rewardsPoolBalance: 0,
    queue: [],
  },
});

export const createInitialMockState = (): MockDbState => ({
  settings: {
    schemaVersion: 1,
    queueVestingMs: 90 * 24 * 60 * 60 * 1000,
    maxActiveQueueItemsPerUser: 20,
    failRateBps: 500,
  },
  features: {
    syntheticExitQueue: true,
  },
  assets: createDefaultAssets(),
  users: {
    [DEFAULT_ADDRESS]: createDefaultUser(),
  },
  txs: {},
});

const memoryStore: { value: string | null } = { value: null };

const getStorage = (): Storage | null => {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }
  return globalThis.localStorage;
};

const getRaw = (): string | null => {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(STORAGE_KEY);
  }
  return memoryStore.value;
};

const setRaw = (value: string): void => {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, value);
    return;
  }
  memoryStore.value = value;
};

export const loadMockState = (): MockDbState => {
  const raw = getRaw();
  if (!raw) {
    return createInitialMockState();
  }
  try {
    const parsed = JSON.parse(raw) as MockDbState;
    if (!parsed.settings || parsed.settings.schemaVersion !== 1) {
      return createInitialMockState();
    }
    return parsed;
  } catch {
    return createInitialMockState();
  }
};

export const saveMockState = (state: MockDbState): void => {
  setRaw(JSON.stringify(state));
};
