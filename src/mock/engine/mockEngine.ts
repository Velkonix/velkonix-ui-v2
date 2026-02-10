import { LendingMockAdapter } from "../adapters/lendingAdapter";
import { StakingMockAdapter } from "../adapters/stakingAdapter";
import { MockSelectors } from "../selectors/portfolioSelectors";
import type { MockDbState } from "../types/state";
import { createInitialMockState, loadMockState, saveMockState } from "./storage";
import { MockTxEngine } from "./txEngine";

export class MockEngine {
  private state: MockDbState;

  private readonly txEngine: MockTxEngine;

  public readonly lending: LendingMockAdapter;

  public readonly staking: StakingMockAdapter;

  public readonly selectors: MockSelectors;

  public constructor() {
    this.state = loadMockState();
    this.txEngine = new MockTxEngine(
      () => this.state,
      (nextState) => {
        this.state = nextState;
        saveMockState(this.state);
      }
    );

    this.lending = new LendingMockAdapter(this.txEngine);
    this.staking = new StakingMockAdapter(this.txEngine);
    this.selectors = new MockSelectors(() => this.state);
  }

  public reset(): void {
    this.state = createInitialMockState();
    saveMockState(this.state);
  }
}
