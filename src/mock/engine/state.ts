import type { Address } from "../types/contracts";
import type { Asset } from "../types/contracts";
import type { MockDbState, MockErrorCode, MockUserState } from "../types/state";
import { MockTxFailure } from "./txEngine";

const createUser = (): MockUserState => ({
  balances: {},
  allowances: {},
  supplies: [],
  borrows: [],
  lendingRewards: 0,
  lendingRewardsByToken: {
    VELK: 0,
    ARB: 0,
  },
  staking: {
    velkBalance: 0,
    xVelkBalance: 0,
    staked: 0,
    rewards: 0,
    apr: 0,
    lockDurationMs: 90 * 24 * 60 * 60 * 1000,
    instantExitPenaltyBps: 3000,
    depositTimestamp: 0,
    rewardsPoolBalance: 0,
    queue: [],
  },
});

export const cloneState = (state: MockDbState): MockDbState =>
  JSON.parse(JSON.stringify(state)) as MockDbState;

export const getOrCreateUser = (state: MockDbState, user: Address): MockUserState => {
  if (!state.users[user]) {
    state.users[user] = createUser();
  }
  return state.users[user];
};

export const getAssetOrThrow = (state: MockDbState, assetId: string): Asset => {
  for (const asset of state.assets) {
    if (asset.id === assetId) {
      return asset;
    }
  }
  throwMockError("ASSET_NOT_FOUND", `Asset ${assetId} not found`);
  throw new Error("Unreachable: asset not found");
};

export const throwMockError = (code: MockErrorCode, message: string): never => {
  throw new MockTxFailure(code, message);
};
