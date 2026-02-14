import type { Address } from "../types/contracts";
import type { Asset } from "../types/contracts";
import type { MockDbState, MockUserState } from "../types/state";

const LEGACY_STORAGE_KEY = "mock.db.state";
const CURRENT_USER_KEY = "mock.wallet.currentUser";
const ASSETS_KEY = "mock.market.assets";
const TX_POOL_KEY = "mock.tx.pool";
const SEED_VERSION_KEY = "mock.seed.version";
const USER_INDEX_KEY = "mock.user.index";
const SETTINGS_KEY = "mock.settings";
const FEATURES_KEY = "mock.features";
const SCHEMA_VERSION = 1;
export const DEFAULT_MOCK_USER = "0x000000000000000000000000000000000000dEaD" as Address;

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
    maxLtv: 80,
    liquidationThreshold: 85,
    liquidationPenalty: 5,
    borrowCap: 2_500_000,
    reserveFactor: 12,
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
    maxLtv: 82.5,
    liquidationThreshold: 86,
    liquidationPenalty: 5,
    borrowCap: 10_000,
    reserveFactor: 15,
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
    maxLtv: 50,
    liquidationThreshold: 65,
    liquidationPenalty: 10,
    borrowCap: 250_000,
    reserveFactor: 20,
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
  lendingRewardsByToken: {
    VELK: 0,
    ARB: 0,
  },
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
    schemaVersion: SCHEMA_VERSION,
    queueVestingMs: 90 * 24 * 60 * 60 * 1000,
    maxActiveQueueItemsPerUser: 20,
    failRateBps: 500,
  },
  features: {
    syntheticExitQueue: true,
  },
  assets: createDefaultAssets(),
  users: {
    [DEFAULT_MOCK_USER]: createDefaultUser(),
  },
  txs: {},
});

const memoryStore = new Map<string, string>();

const getStorage = (): Storage | null => {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }
  return globalThis.localStorage;
};

const getRaw = (): string | null => {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(LEGACY_STORAGE_KEY);
  }
  return memoryStore.get(LEGACY_STORAGE_KEY) ?? null;
};

const getByKey = (key: string): string | null => {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
};

const setByKey = (key: string, value: string): void => {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
};

const removeByKey = (key: string): void => {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }
  memoryStore.delete(key);
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const loadLegacyState = (): MockDbState | null => {
  const parsed = parseJson<MockDbState>(getRaw());
  if (!parsed || parsed.settings?.schemaVersion !== SCHEMA_VERSION) {
    return null;
  }
  return parsed;
};

const readUsers = (): Record<Address, MockUserState> | null => {
  const index = parseJson<Address[]>(getByKey(USER_INDEX_KEY));
  if (!index || index.length === 0) {
    return null;
  }
  const users: Record<Address, MockUserState> = {} as Record<Address, MockUserState>;
  for (const address of index) {
    const balances = parseJson<Record<string, number>>(getByKey(`mock.user.${address}.balances`));
    const allowances = parseJson<Record<string, number>>(getByKey(`mock.user.${address}.allowances`));
    const supplies = parseJson<MockUserState["supplies"]>(getByKey(`mock.user.${address}.supplies`));
    const borrows = parseJson<MockUserState["borrows"]>(getByKey(`mock.user.${address}.borrows`));
    const staking = parseJson<MockUserState["staking"]>(getByKey(`mock.user.${address}.staking`));
    const rewards = parseJson<{ lendingRewards: number; lendingRewardsByToken?: Record<string, number> }>(
      getByKey(`mock.user.${address}.rewards`)
    );
    if (!balances || !allowances || !supplies || !borrows || !staking || !rewards) {
      return null;
    }
    users[address] = {
      balances,
      allowances,
      supplies,
      borrows,
      staking,
      lendingRewards: rewards.lendingRewards,
      lendingRewardsByToken: rewards.lendingRewardsByToken ?? { VELK: rewards.lendingRewards, ARB: 0 },
    };
  }
  return users;
};

const loadBySplitKeys = (): MockDbState | null => {
  const schemaVersion = Number(getByKey(SEED_VERSION_KEY));
  if (!Number.isFinite(schemaVersion)) {
    return null;
  }
  if (schemaVersion !== SCHEMA_VERSION) {
    return null;
  }
  const settings = parseJson<MockDbState["settings"]>(getByKey(SETTINGS_KEY));
  const features = parseJson<MockDbState["features"]>(getByKey(FEATURES_KEY));
  const assets = parseJson<Asset[]>(getByKey(ASSETS_KEY));
  const txs = parseJson<MockDbState["txs"]>(getByKey(TX_POOL_KEY));
  const users = readUsers();
  if (!settings || !features || !assets || !txs || !users) {
    return null;
  }
  return {
    settings,
    features,
    assets,
    users,
    txs,
  };
};

export const getCurrentMockUser = (): Address => {
  const fromStorage = getByKey(CURRENT_USER_KEY);
  if (fromStorage && fromStorage.startsWith("0x")) {
    return fromStorage as Address;
  }
  return DEFAULT_MOCK_USER;
};

export const getPersistedMockUser = (): Address | null => {
  const fromStorage = getByKey(CURRENT_USER_KEY);
  if (fromStorage && fromStorage.startsWith("0x")) {
    return fromStorage as Address;
  }
  return null;
};

export const setCurrentMockUser = (address: Address): void => {
  setByKey(CURRENT_USER_KEY, address);
};

export const ensureMockUser = (address: Address): void => {
  const state = loadMockState();
  if (!state.users[address]) {
    state.users[address] = createDefaultUser();
    saveMockState(state);
  }
  setCurrentMockUser(address);
};

export const loadMockState = (): MockDbState => {
  const splitState = loadBySplitKeys();
  if (splitState) {
    return splitState;
  }

  const legacyState = loadLegacyState();
  if (legacyState) {
    saveMockState(legacyState);
    removeByKey(LEGACY_STORAGE_KEY);
    return legacyState;
  }

  const initial = createInitialMockState();
  saveMockState(initial);
  return initial;
};

export const saveMockState = (state: MockDbState): void => {
  setByKey(SEED_VERSION_KEY, String(state.settings.schemaVersion));
  setByKey(SETTINGS_KEY, JSON.stringify(state.settings));
  setByKey(FEATURES_KEY, JSON.stringify(state.features));
  setByKey(ASSETS_KEY, JSON.stringify(state.assets));
  setByKey(TX_POOL_KEY, JSON.stringify(state.txs));

  const addresses = Object.keys(state.users) as Address[];
  setByKey(USER_INDEX_KEY, JSON.stringify(addresses));
  for (const address of addresses) {
    const user = state.users[address];
    setByKey(`mock.user.${address}.balances`, JSON.stringify(user.balances));
    setByKey(`mock.user.${address}.allowances`, JSON.stringify(user.allowances));
    setByKey(`mock.user.${address}.supplies`, JSON.stringify(user.supplies));
    setByKey(`mock.user.${address}.borrows`, JSON.stringify(user.borrows));
    setByKey(`mock.user.${address}.staking`, JSON.stringify(user.staking));
    setByKey(
      `mock.user.${address}.rewards`,
      JSON.stringify({
        lendingRewards: user.lendingRewards,
        lendingRewardsByToken: user.lendingRewardsByToken,
      })
    );
  }

  const currentUser = getCurrentMockUser();
  if (!state.users[currentUser] && addresses.length > 0) {
    setCurrentMockUser(addresses[0]);
  } else if (addresses.length > 0) {
    setCurrentMockUser(currentUser);
  }
};
