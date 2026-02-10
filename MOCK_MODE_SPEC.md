# Velkonix UI v2 - Mock Mode Specification

## 1. Purpose

This document defines the implementation contract for UI mock mode in `velkonix-ui-v2`.

Goals:
- Provide a single technical source of truth for mock behavior used by UI pages.
- Lock required on-chain interfaces from `velkonix-contracts` and `velkonix-misc`.
- Define UI-level mock API contracts, storage schema, and transaction lifecycle.
- Include a provisional mock implementation for `exitQueue` (future on-chain feature).

This spec supplements `PROJECT_SPEC.md` and does not replace it.

## 2. Scope

Mock mode is enabled by `VITE_MOCK_MODE=true`.

In scope:
- Markets
- Asset page
- Dashboard
- Staking (Convert, Stake, Rewards, Exit)
- Wallet mock identity
- Deterministic tx simulation (`pending/success/failed`)

Out of scope:
- Admin flows
- Liquidation UI
- Flashloan
- Governance

## 3. Source Contracts and Canonical Paths

## 3.1 Lending (velkonix-contracts)

- `velkonix-contracts/src/contracts/interfaces/IPool.sol`
- `velkonix-contracts/src/contracts/interfaces/IPoolAddressesProvider.sol`
- `velkonix-contracts/src/contracts/interfaces/IPoolDataProvider.sol`
- `velkonix-contracts/src/contracts/helpers/interfaces/IUiPoolDataProviderV3.sol`
- `velkonix-contracts/src/contracts/interfaces/IAaveOracle.sol`
- `velkonix-contracts/src/contracts/rewards/interfaces/IRewardsController.sol`
- `velkonix-contracts/src/contracts/rewards/interfaces/IRewardsDistributor.sol`
- `velkonix-contracts/src/contracts/helpers/interfaces/IUiIncentiveDataProviderV3.sol`
- `velkonix-contracts/src/contracts/protocol/libraries/types/DataTypes.sol`

## 3.2 Staking (velkonix-misc)

- `velkonix-misc/src/staking/Staking.sol`
- `velkonix-misc/src/staking/RewardsDistributor.sol`
- `velkonix-misc/src/token/VELK.sol`
- `velkonix-misc/src/token/xVELK.sol`
- `velkonix-misc/src/treasury/Treasury.sol` (source of rewards funding model)

## 4. On-chain ABI Surface Required by UI

Only these methods are mandatory for mock parity.

## 4.1 Markets / Asset Read Models

Primary read source:
- `IUiPoolDataProviderV3.getReservesData(provider)`
- `IUiPoolDataProviderV3.getUserReservesData(provider, user)`
- `IUiPoolDataProviderV3.getReservesList(provider)`

Reserve/user structures used by UI:
- `AggregatedReserveData`
- `UserReserveData`
- `BaseCurrencyInfo`

Auxiliary read calls:
- `IPool.getUserAccountData(user)`
- `IPool.getReserveData(asset)`
- `IPool.getReserveNormalizedIncome(asset)`
- `IPool.getReserveNormalizedVariableDebt(asset)`
- `IAaveOracle.getAssetPrice(asset)`

## 4.2 Lending Writes

Approve / supply / withdraw:
- `IERC20.approve(spender, amount)` (token-level)
- `IPool.supply(asset, amount, onBehalfOf, referralCode)`
- `IPool.withdraw(asset, amount, to)`

Borrow / repay:
- `IPool.borrow(asset, amount, interestRateMode, referralCode, onBehalfOf)`
- `IPool.repay(asset, amount, interestRateMode, onBehalfOf)`
- `IPool.repayWithATokens(asset, amount, interestRateMode)` (optional in UI flow)

Collateral:
- `IPool.setUserUseReserveAsCollateral(asset, useAsCollateral)`

Constraints:
- `interestRateMode=2` (variable) in mock.
- `referralCode=0` in mock.

## 4.3 Lending Rewards (Dashboard claim)

Read:
- `IRewardsDistributor.getUserRewards(assets, user, reward)`
- `IRewardsDistributor.getAllUserRewards(assets, user)`
- `IRewardsDistributor.getRewardsByAsset(asset)`

Claim:
- `IRewardsController.claimRewards(...)`
- `IRewardsController.claimAllRewards(...)`

## 4.4 Staking Writes (velkonix-misc)

From `Staking.sol`:
- `stake(amount)` (VELK -> xVELK mint, resets lock timestamp)
- `exit()` (available only after lock)
- `instantExit(amount)` (pre-unlock, penalty applies)

From `RewardsDistributor.sol`:
- `deposit(amount)` (xVELK into rewards pool)
- `withdraw(amount)`
- `claim()`

Key constants from staking:
- `lockDuration`
- `instantExitPenaltyBps`

## 4.5 Events to Mirror in Mock Tx Logs

Lending (`IPool`):
- `Supply`
- `Withdraw`
- `Borrow`
- `Repay`
- `ReserveUsedAsCollateralEnabled`
- `ReserveUsedAsCollateralDisabled`

Lending rewards:
- `RewardsClaimed`

Staking:
- `Staked`
- `Exited`
- `InstantExit`

Staking rewards:
- `Deposited`
- `Withdrawn`
- `Claimed`
- `RewardNotified`

## 5. Fixed UI Data Contracts (from PROJECT_SPEC.md)

Do not change these shapes:

```ts
Asset {
  id: string
  symbol: string
  name: string
  icon: string
  totalSupplied: number
  totalBorrowed: number
  supplyApy: number
  borrowApy: number
}

UserSupply {
  assetId: string
  balance: number
  apy: number
  isCollateral: boolean
}

UserBorrow {
  assetId: string
  debt: number
  apy: number
}

StakingState {
  staked: number
  rewards: number
  apr: number
  exitQueue: {
    startDate: number
    amount: number
    canExit: boolean
  }[]
}

Tx {
  id: string
  status: 'pending' | 'success' | 'failed'
}
```

## 6. UI Mock API Contracts (mandatory)

These are UI-engine contracts (not on-chain ABIs). They are required to make UI deterministic and testable.

```ts
type Address = `0x${string}`;
type AssetId = string;

interface MockTxOptions {
  op: string;
  user: Address;
  assetId?: AssetId;
  amount?: number;
}

interface MockTxResult {
  txId: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

interface LendingMockApi {
  approve(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  supply(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  withdraw(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  borrow(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  repay(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult>;
  setCollateral(user: Address, assetId: AssetId, enabled: boolean): Promise<MockTxResult>;
  claimLendingRewards(user: Address): Promise<MockTxResult>;
}

interface StakingMockApi {
  convert(user: Address, amount: number): Promise<MockTxResult>; // alias stake into Staking
  stakeToRewards(user: Address, amount: number): Promise<MockTxResult>; // RewardsDistributor.deposit
  unstakeFromRewards(user: Address, amount: number): Promise<MockTxResult>; // RewardsDistributor.withdraw
  claimStakingRewards(user: Address): Promise<MockTxResult>;
  instantExit(user: Address, amount: number): Promise<MockTxResult>;
  vestingExit(user: Address): Promise<MockTxResult>;
  requestExit(user: Address, amount: number): Promise<MockTxResult>; // mock-only exit queue
  executeExitFromQueue(user: Address, queueItemId: string): Promise<MockTxResult>; // mock-only exit queue
}

interface MockReadApi {
  getAssets(): Asset[];
  getUserSupplies(user: Address): UserSupply[];
  getUserBorrows(user: Address): UserBorrow[];
  getStakingState(user: Address): StakingState;
  getTx(txId: string): Tx | null;
}
```

## 7. Persistence and Local DB Contract

Storage backend: `localStorage` or IndexedDB.

Minimum state keys:
- `mock.wallet.currentUser`
- `mock.market.assets`
- `mock.user.<address>.balances`
- `mock.user.<address>.supplies`
- `mock.user.<address>.borrows`
- `mock.user.<address>.staking`
- `mock.user.<address>.rewards`
- `mock.tx.pool`
- `mock.seed.version`

Versioning:
- Keep `schemaVersion`.
- If version mismatch -> full reseed with deterministic fixtures.

## 8. Deterministic Tx Engine Contract

Rules:
- Every write operation produces `Tx` with initial status `pending`.
- Pending delay range is deterministic per operation key.
- Final status is computed deterministically from operation hash.

Deterministic status algorithm:
1. Build key: `${op}|${user}|${assetId}|${amount}|${nonce}`.
2. Hash key (stable non-crypto hash is enough).
3. `hash % 100 < failRateBps/100` => `failed`, else `success`.

Defaults:
- `pendingMs=900..1800` (derived from hash, not random runtime state)
- `failRateBps=500` (5%) globally; can be operation-specific.

On failure:
- No state mutation except tx record.
- Error code from fixed enum (`INSUFFICIENT_BALANCE`, `LOCKED`, `HEALTH_FACTOR_LOW`, ...).

On success:
- Apply state transition atomically.
- Recompute all derived fields before persisting.

## 9. Staking Mock Model with Provisional Exit Queue

Important:
- Current `Staking.sol` has no queue primitive.
- UI mock must include queue because `PROJECT_SPEC.md` requires `exitQueue`.
- Queue is mock-only and marked as forward-compatible abstraction.

## 9.1 Mapping to On-chain Truth

On-chain now:
- Immediate exit after unlock: `exit()`.
- Early partial exit with penalty: `instantExit(amount)`.

Mock extension:
- Add explicit queued vesting requests before final exit.
- Keep penalty and lock constraints consistent with existing staking mechanics.

## 9.2 Mock Queue Data Model

```ts
interface MockExitQueueItem {
  id: string;
  startDate: number;      // unix ms
  unlockDate: number;     // startDate + lockDurationMs or queuePolicy delay
  amount: number;
  canExit: boolean;
  status: 'queued' | 'ready' | 'executed' | 'cancelled';
}

interface MockStakingStore {
  velkBalance: number;
  xVelkBalance: number;
  staked: number; // matches StakingState.staked
  rewards: number;
  apr: number;
  lockDurationMs: number;
  instantExitPenaltyBps: number;
  queue: MockExitQueueItem[];
}
```

UI projection contract:
- `StakingState.exitQueue` is derived from `queue.filter(status in ['queued','ready'])`
- mapping:
  - `startDate` -> `startDate`
  - `amount` -> `amount`
  - `canExit` -> `Date.now() >= unlockDate && status==='ready'`

## 9.3 Queue Operations

`requestExit(user, amount)`:
- Validate `amount > 0` and `amount <= stakedAvailable`.
- Reserve `amount` from withdrawable staking balance.
- Create queue item:
  - `startDate=now`
  - `unlockDate=now + queueVestingMs`
  - `status='queued'`
- Tx emits mock event `ExitQueued(user, amount, unlockDate)`.

`syncExitQueue(user)` (read-side helper):
- For each queued item, if `now >= unlockDate`, mark `status='ready'` and `canExit=true`.

`executeExitFromQueue(user, queueItemId)`:
- Require item is `ready`.
- Burn/reduce xVELK and release VELK payout 1:1 for queued amount.
- Mark item as `executed`.
- Tx emits mock event `ExitQueueExecuted(user, amount)`.

`cancelExitRequest(user, queueItemId)` (optional):
- Allowed only while `status='queued'`.
- Release reserved amount back to active staked bucket.
- Mark `cancelled`.

## 9.4 Queue Policy Defaults

- `queueVestingMs = lockDurationMs` (default behavior)
- `maxActiveQueueItemsPerUser = 20`
- FIFO execution in UI
- Queue does not apply instant-exit penalty
- Penalty remains only in `instantExit`

## 9.5 Reconciliation Rules

Because queue is mock-only:
- Keep it isolated from on-chain ABI adapters.
- Feature flag: `mock.features.syntheticExitQueue=true`.
- In real mode this feature is disabled.

## 10. Recalculation Rules

After each successful write:

1. Recompute reserve totals:
- `totalSupplied`
- `totalBorrowed`

2. Recompute user dashboard:
- net worth
- borrow utilization
- average APY

3. Recompute staking:
- `staked`
- `rewards`
- queue readiness

4. Recompute claimables:
- lending rewards
- staking rewards

5. Persist state snapshot and tx log.

## 11. UI-to-Contract Traceability Matrix

Markets:
- reads: `getReservesData`, `getReservesList`

Asset page:
- actions: `approve`, `supply`, `withdraw`, `borrow`, `repay`
- reads: reserve data + user account data

Dashboard:
- reads: user supplies, user borrows, account data, rewards
- actions: collateral toggle, repay/withdraw, claim lending rewards

Staking Convert:
- write: `stake(amount)` (VELK -> xVELK)

Staking Stake tab:
- writes: `RewardsDistributor.deposit/withdraw`

Staking Rewards tab:
- read: `userPendingRewards`, `balanceOf`, `apr(derived)`
- write: `claim()`

Staking Exit tab:
- writes: `instantExit`, `vestingExit` (`exit` parity), `requestExit`, `executeExitFromQueue`

## 12. Acceptance Criteria for Mock Mode

- All scope actions execute in mock mode with tx lifecycle (`pending/success/failed`).
- UI data is produced only via mock providers (no hardcoded placeholders in page components).
- Data contracts from `PROJECT_SPEC.md` are unchanged.
- `exitQueue` is available and functional in mock-only mode.
- Queue behavior is deterministic and persisted across reloads.
- Staking base behavior remains compatible with current on-chain `Staking.sol` constraints.
- Unit tests cover:
  - tx deterministic outcomes
  - staking queue transitions (`queued -> ready -> executed`)
  - instant exit penalty
  - reward accrual and claim

## 13. Implementation Notes

- Keep mock code under `src/mock/`.
- Separate concerns:
  - `engine/` for tx simulation and persistence
  - `adapters/` for lending/staking API surface
  - `selectors/` for view models
- Do not leak synthetic queue behavior into real-mode adapters.

