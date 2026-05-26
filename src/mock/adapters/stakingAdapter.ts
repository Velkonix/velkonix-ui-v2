import type { Address, MockTxResult, StakingMockApi } from "../types/contracts";
import type { MockExitQueueItem, MockStakingStore } from "../types/state";
import { cloneState, getOrCreateUser, throwMockError } from "../engine/state";
import { hashString } from "../engine/hash";
import { MockTxEngine } from "../engine/txEngine";

const ensurePositiveAmount = (amount: number): void => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throwMockError("INVALID_AMOUNT", "Amount must be positive");
  }
};

const updateQueueReadiness = (staking: MockStakingStore, nowMs: number): void => {
  staking.queue.forEach((item) => {
    if (item.status === "queued" && nowMs >= item.unlockDate) {
      item.status = "ready";
      item.canExit = true;
    }
  });
};

const activeQueueCount = (staking: MockStakingStore): number =>
  staking.queue.filter((item) => item.status === "queued" || item.status === "ready").length;

const queuedReservedAmount = (staking: MockStakingStore): number =>
  staking.queue
    .filter((item) => item.status === "queued" || item.status === "ready")
    .reduce((sum, item) => sum + item.amount, 0);

const createQueueId = (user: Address, amount: number, nowMs: number): string => {
  const seed = `${user}|${amount}|${nowMs}`;
  return `q_${hashString(seed).toString(16)}`;
};

export class StakingMockAdapter implements StakingMockApi {
  public constructor(private readonly txEngine: MockTxEngine) {}

  public convert(user: Address, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "convert", user, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      const staking = userState.staking;

      if (staking.velkBalance < amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient VELK balance");
      }

      staking.velkBalance -= amount;
      staking.xVelkBalance += amount;
      staking.staked += amount;
      staking.depositTimestamp = Date.now();
      return next;
    });
  }

  public stakeToRewards(user: Address, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "stakeToRewards", user, amount }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      if (staking.xVelkBalance < amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient xVELK");
      }

      staking.xVelkBalance -= amount;
      staking.rewardsPoolBalance += amount;
      return next;
    });
  }

  public unstakeFromRewards(user: Address, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "unstakeFromRewards", user, amount }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      if (staking.rewardsPoolBalance < amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient rewards pool balance");
      }
      staking.rewardsPoolBalance -= amount;
      staking.xVelkBalance += amount;
      return next;
    });
  }

  public claimStakingRewards(user: Address): Promise<MockTxResult> {
    return this.txEngine.run({ op: "claimStakingRewards", user }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      if (staking.rewards <= 0) {
        throwMockError("NO_REWARDS", "No staking rewards");
      }
      staking.xVelkBalance += staking.rewards;
      staking.rewards = 0;
      return next;
    });
  }

  public instantExit(user: Address, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "instantExit", user, amount }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      const nowMs = Date.now();
      const isUnlocked =
        staking.depositTimestamp > 0 && nowMs >= staking.depositTimestamp + staking.lockDurationMs;
      if (isUnlocked) {
        throwMockError("LOCKED", "Use vesting exit after unlock");
      }
      const available = staking.staked - queuedReservedAmount(staking);
      if (available < amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient staked amount");
      }

      const penalty = (amount * staking.instantExitPenaltyBps) / 10_000;
      const payout = amount - penalty;
      staking.staked -= amount;
      staking.xVelkBalance = Math.max(0, staking.xVelkBalance - amount);
      staking.velkBalance += payout;
      staking.rewards += penalty;
      return next;
    });
  }

  public vestingExit(user: Address): Promise<MockTxResult> {
    return this.txEngine.run({ op: "vestingExit", user }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      const nowMs = Date.now();
      const isUnlocked =
        staking.depositTimestamp > 0 && nowMs >= staking.depositTimestamp + staking.lockDurationMs;
      if (!isUnlocked) {
        throwMockError("LOCKED", "Position is still locked");
      }

      const reserved = queuedReservedAmount(staking);
      const amount = Math.max(0, staking.staked - reserved);
      if (amount <= 0) {
        throwMockError("INSUFFICIENT_BALANCE", "No withdrawable staked amount");
      }
      staking.staked -= amount;
      staking.xVelkBalance = Math.max(0, staking.xVelkBalance - amount);
      staking.velkBalance += amount;
      return next;
    });
  }

  public requestExit(user: Address, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "requestExit", user, amount }, (state) => {
      const next = cloneState(state);
      if (!next.features.syntheticExitQueue) {
        throwMockError("INVALID_AMOUNT", "Synthetic queue is disabled");
      }

      const staking = getOrCreateUser(next, user).staking;
      const nowMs = Date.now();
      updateQueueReadiness(staking, nowMs);

      if (activeQueueCount(staking) >= next.settings.maxActiveQueueItemsPerUser) {
        throwMockError("INVALID_AMOUNT", "Too many active queue items");
      }

      const available = staking.staked - queuedReservedAmount(staking);
      if (available < amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient staked amount for queue");
      }

      const unlockDate = nowMs + next.settings.queueVestingMs;
      const item: MockExitQueueItem = {
        id: createQueueId(user, amount, nowMs),
        startDate: nowMs,
        unlockDate,
        amount,
        canExit: false,
        status: "queued",
      };
      staking.queue.push(item);
      return next;
    });
  }

  public executeExitFromQueue(user: Address, queueItemId: string): Promise<MockTxResult> {
    return this.txEngine.run({ op: "executeExitFromQueue", user }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      const nowMs = Date.now();
      updateQueueReadiness(staking, nowMs);

      const item = staking.queue.find((entry) => entry.id === queueItemId);
      if (item === undefined || item.status === "cancelled" || item.status === "executed") {
        throwMockError("QUEUE_ITEM_NOT_FOUND", "Queue item not found");
      }
      const queueItem = item as NonNullable<typeof item>;
      if (queueItem.status !== "ready" || !queueItem.canExit) {
        throwMockError("QUEUE_ITEM_NOT_READY", "Queue item is not ready");
      }
      if (staking.staked < queueItem.amount) {
        throwMockError("INSUFFICIENT_BALANCE", "Insufficient staked amount");
      }

      staking.staked -= queueItem.amount;
      staking.xVelkBalance = Math.max(0, staking.xVelkBalance - queueItem.amount);
      staking.velkBalance += queueItem.amount;
      queueItem.status = "executed";
      queueItem.canExit = false;
      return next;
    });
  }

  public cancelExitRequest(user: Address, queueItemId: string): Promise<MockTxResult> {
    return this.txEngine.run({ op: "cancelExitRequest", user }, (state) => {
      const next = cloneState(state);
      const staking = getOrCreateUser(next, user).staking;
      const item = staking.queue.find((entry) => entry.id === queueItemId);
      if (item === undefined || item.status === "cancelled" || item.status === "executed") {
        throwMockError("QUEUE_ITEM_NOT_FOUND", "Queue item not found");
      }
      const queueItem = item as NonNullable<typeof item>;
      if (queueItem.status !== "queued") {
        throwMockError("QUEUE_ITEM_NOT_CANCELLABLE", "Only queued items can be cancelled");
      }
      queueItem.status = "cancelled";
      queueItem.canExit = false;
      return next;
    });
  }
}
