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
});
