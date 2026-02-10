import { createInitialMockState, loadMockState, MockEngine, saveMockState } from "../../mock";

const USER = "0x000000000000000000000000000000000000dEaD" as const;

const flushTimers = async (ms: number): Promise<void> => {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
};

describe("MockEngine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const initial = createInitialMockState();
    initial.settings.failRateBps = 0;
    initial.settings.queueVestingMs = 10_000;
    saveMockState(initial);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("writes tx as pending and later success", async () => {
    const engine = new MockEngine();

    const txPromise = engine.lending.approve(USER, "USDC", 1_000);

    const txsAfterStart = loadMockState().txs;
    const ids = Object.keys(txsAfterStart);
    expect(ids).toHaveLength(1);
    expect(txsAfterStart[ids[0]]?.status).toBe("pending");

    await flushTimers(2_000);
    const result = await txPromise;

    expect(result.status).toBe("success");
    expect(engine.selectors.getTx(result.txId)?.status).toBe("success");
  });

  test("supports synthetic exit queue lifecycle", async () => {
    const engine = new MockEngine();

    const convertTx = engine.staking.convert(USER, 1_000);
    await flushTimers(2_000);
    expect((await convertTx).status).toBe("success");

    const requestTx = engine.staking.requestExit(USER, 400);
    await flushTimers(2_000);
    expect((await requestTx).status).toBe("success");

    const queueBefore = engine.selectors.getStakingState(USER).exitQueue;
    expect(queueBefore).toHaveLength(1);
    expect(queueBefore[0]?.canExit).toBe(false);

    const queueItemId = loadMockState().users[USER]?.staking.queue[0]?.id;
    expect(queueItemId).toBeDefined();
    if (!queueItemId) {
      throw new Error("Queue item should exist");
    }

    const earlyExecution = engine.staking.executeExitFromQueue(USER, queueItemId);
    await flushTimers(2_000);
    expect((await earlyExecution).status).toBe("failed");

    await flushTimers(10_500);

    const exitExecution = engine.staking.executeExitFromQueue(USER, queueItemId);
    await flushTimers(2_000);
    expect((await exitExecution).status).toBe("success");

    const stakingState = engine.selectors.getStakingState(USER);
    expect(stakingState.staked).toBe(600);
    expect(stakingState.exitQueue).toHaveLength(0);
  });

  test("fails deterministically when failRateBps is 10000", async () => {
    const state = loadMockState();
    state.settings.failRateBps = 10_000;
    saveMockState(state);

    const engine = new MockEngine();
    const txPromise = engine.lending.approve(USER, "USDC", 500);
    await flushTimers(2_000);
    const result = await txPromise;

    expect(result.status).toBe("failed");
    expect(result.error).toBe("DETERMINISTIC_FAILURE");
    expect(engine.selectors.getTx(result.txId)?.status).toBe("failed");
  });

  test("applies instant exit penalty and supports staking rewards claim", async () => {
    const engine = new MockEngine();
    const before = loadMockState().users[USER]?.staking;
    expect(before).toBeDefined();
    if (!before) {
      throw new Error("Staking state must exist");
    }

    const convert = engine.staking.convert(USER, 1_000);
    await flushTimers(2_000);
    expect((await convert).status).toBe("success");

    const instantExit = engine.staking.instantExit(USER, 400);
    await flushTimers(2_000);
    expect((await instantExit).status).toBe("success");

    const afterExit = loadMockState().users[USER]?.staking;
    expect(afterExit).toBeDefined();
    if (!afterExit) {
      throw new Error("Staking state must exist");
    }
    const penalty = (400 * before.instantExitPenaltyBps) / 10_000;
    expect(afterExit.rewards).toBeCloseTo(penalty, 8);

    const xVelkBeforeClaim = afterExit.xVelkBalance;
    const claim = engine.staking.claimStakingRewards(USER);
    await flushTimers(2_000);
    expect((await claim).status).toBe("success");

    const afterClaim = loadMockState().users[USER]?.staking;
    expect(afterClaim).toBeDefined();
    if (!afterClaim) {
      throw new Error("Staking state must exist");
    }
    expect(afterClaim.rewards).toBe(0);
    expect(afterClaim.xVelkBalance).toBeCloseTo(xVelkBeforeClaim + penalty, 8);
  });

  test("accrues and claims lending rewards", async () => {
    const engine = new MockEngine();
    const approve = engine.lending.approve(USER, "USDC", 1_000);
    await flushTimers(2_000);
    expect((await approve).status).toBe("success");

    const before = loadMockState().users[USER];
    expect(before).toBeDefined();
    if (!before) {
      throw new Error("User state must exist");
    }

    const supply = engine.lending.supply(USER, "USDC", 1_000);
    await flushTimers(2_000);
    expect((await supply).status).toBe("success");

    const withRewards = loadMockState().users[USER];
    expect(withRewards).toBeDefined();
    if (!withRewards) {
      throw new Error("User state must exist");
    }
    expect(withRewards.lendingRewards).toBeGreaterThan(0);

    const usdcBeforeClaim = withRewards.balances.USDC ?? 0;
    const rewardBeforeClaim = withRewards.lendingRewards;
    const claim = engine.lending.claimLendingRewards(USER);
    await flushTimers(2_000);
    expect((await claim).status).toBe("success");

    const afterClaim = loadMockState().users[USER];
    expect(afterClaim).toBeDefined();
    if (!afterClaim) {
      throw new Error("User state must exist");
    }
    expect(afterClaim.lendingRewards).toBe(0);
    expect(afterClaim.balances.USDC).toBeCloseTo(usdcBeforeClaim + rewardBeforeClaim, 8);
  });

  test("read-side canExit flips to true after unlock time", async () => {
    const engine = new MockEngine();

    const convertTx = engine.staking.convert(USER, 500);
    await flushTimers(2_000);
    expect((await convertTx).status).toBe("success");

    const requestTx = engine.staking.requestExit(USER, 200);
    await flushTimers(2_000);
    expect((await requestTx).status).toBe("success");

    expect(engine.selectors.getStakingState(USER).exitQueue[0]?.canExit).toBe(false);
    await flushTimers(10_500);
    expect(engine.selectors.getStakingState(USER).exitQueue[0]?.canExit).toBe(true);
  });

  test("cancels queued exit request", async () => {
    const engine = new MockEngine();

    const convertTx = engine.staking.convert(USER, 700);
    await flushTimers(2_000);
    expect((await convertTx).status).toBe("success");

    const requestTx = engine.staking.requestExit(USER, 300);
    await flushTimers(2_000);
    expect((await requestTx).status).toBe("success");

    const queueItemId = loadMockState().users[USER]?.staking.queue[0]?.id;
    expect(queueItemId).toBeDefined();
    if (!queueItemId) {
      throw new Error("Queue item should exist");
    }

    const cancelTx = engine.staking.cancelExitRequest(USER, queueItemId);
    await flushTimers(2_000);
    expect((await cancelTx).status).toBe("success");

    const activeQueue = engine.selectors.getStakingState(USER).exitQueue;
    expect(activeQueue).toHaveLength(0);
  });
});
