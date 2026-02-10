import type { MockTxOptions, MockTxResult, Tx } from "../types/contracts";
import type { MockDbState, MockErrorCode } from "../types/state";
import { hashString } from "./hash";

export class MockTxFailure extends Error {
  public readonly code: MockErrorCode;

  public constructor(code: MockErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type ReadState = () => MockDbState;
type WriteState = (nextState: MockDbState) => void;

const toTxRecord = (id: string, status: Tx["status"]): Tx => ({
  id,
  status,
});

export class MockTxEngine {
  private nonce = 0;

  public constructor(
    private readonly readState: ReadState,
    private readonly writeState: WriteState
  ) {}

  public async run(
    options: MockTxOptions,
    onSuccess: (state: MockDbState) => MockDbState
  ): Promise<MockTxResult> {
    const txId = this.createTxId(options);
    this.updateTx(txId, "pending");

    const delayMs = 900 + (hashString(txId) % 900);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

    const shouldFail = this.mustFail(options, txId);
    if (shouldFail) {
      this.updateTx(txId, "failed");
      return { txId, status: "failed", error: "DETERMINISTIC_FAILURE" };
    }

    try {
      const state = this.readState();
      const next = onSuccess(state);
      this.writeState(next);
      this.updateTx(txId, "success");
      return { txId, status: "success" };
    } catch (error) {
      this.updateTx(txId, "failed");
      if (error instanceof MockTxFailure) {
        return { txId, status: "failed", error: error.code };
      }
      return { txId, status: "failed", error: "UNKNOWN_ERROR" };
    }
  }

  private createTxId(options: MockTxOptions): string {
    this.nonce += 1;
    const seed = `${options.op}|${options.user}|${options.assetId ?? ""}|${options.amount ?? ""}|${this.nonce}`;
    return `tx_${hashString(seed).toString(16)}`;
  }

  private mustFail(options: MockTxOptions, txId: string): boolean {
    const state = this.readState();
    const seed = `${txId}|${options.op}|${state.settings.failRateBps}`;
    const value = hashString(seed) % 10_000;
    return value < state.settings.failRateBps;
  }

  private updateTx(txId: string, status: Tx["status"]): void {
    const state = this.readState();
    const next: MockDbState = {
      ...state,
      txs: {
        ...state.txs,
        [txId]: toTxRecord(txId, status),
      },
    };
    this.writeState(next);
  }
}
