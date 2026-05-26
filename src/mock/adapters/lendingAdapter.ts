import type { Address, AssetId, LendingMockApi, MockTxResult } from "../types/contracts";
import type { MockDbState, MockUserState } from "../types/state";
import { cloneState, getAssetOrThrow, getOrCreateUser, throwMockError } from "../engine/state";
import { MockTxEngine } from "../engine/txEngine";

const VARIABLE_DEBT_APY_BONUS = 0.15;
const SUPPLY_APY_BONUS = 0.1;
const SUPPLY_REWARD_APY = 0.42;
const BORROW_REWARD_APY = 0.27;
const SUPPLY_REWARD_VELK_SHARE = 0.65;
const SUPPLY_REWARD_ARB_SHARE = 1 - SUPPLY_REWARD_VELK_SHARE;
const REWARD_ACCRUAL_PER_SUPPLY = 0.0008;

const ensurePositiveAmount = (amount: number): void => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throwMockError("INVALID_AMOUNT", "Amount must be positive");
  }
};

const getUserSupply = (userState: MockUserState, assetId: AssetId) =>
  userState.supplies.find((item) => item.assetId === assetId);

const getUserBorrow = (userState: MockUserState, assetId: AssetId) =>
  userState.borrows.find((item) => item.assetId === assetId);

export class LendingMockAdapter implements LendingMockApi {
  public constructor(private readonly txEngine: MockTxEngine) {}

  public approve(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "approve", user, assetId, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      userState.allowances[assetId] = Math.max(userState.allowances[assetId] ?? 0, amount);
      return next;
    });
  }

  public supply(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "supply", user, assetId, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      this.applySupply(next, userState, assetId, amount);
      return next;
    });
  }

  public withdraw(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "withdraw", user, assetId, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      this.applyWithdraw(next, userState, assetId, amount);
      return next;
    });
  }

  public borrow(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "borrow", user, assetId, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      this.applyBorrow(next, userState, assetId, amount);
      return next;
    });
  }

  public repay(user: Address, assetId: AssetId, amount: number): Promise<MockTxResult> {
    ensurePositiveAmount(amount);
    return this.txEngine.run({ op: "repay", user, assetId, amount }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      this.applyRepay(next, userState, assetId, amount);
      return next;
    });
  }

  public setCollateral(user: Address, assetId: AssetId, enabled: boolean): Promise<MockTxResult> {
    return this.txEngine.run({ op: "setCollateral", user, assetId }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      const supply = getUserSupply(userState, assetId);
      if (supply === undefined) {
        throwMockError("INSUFFICIENT_SUPPLY", "No supplied position");
      }
      const currentSupply = supply as NonNullable<typeof supply>;
      currentSupply.isCollateral = enabled;
      return next;
    });
  }

  public claimLendingRewards(user: Address): Promise<MockTxResult> {
    return this.txEngine.run({ op: "claimLendingRewards", user }, (state) => {
      const next = cloneState(state);
      const userState = getOrCreateUser(next, user);
      if (userState.lendingRewards <= 0) {
        throwMockError("NO_REWARDS", "No lending rewards");
      }
      userState.balances.USDC = (userState.balances.USDC ?? 0) + userState.lendingRewards;
      userState.lendingRewards = 0;
      userState.lendingRewardsByToken = { VELK: 0, ARB: 0 };
      return next;
    });
  }

  private syncSupplyApy(userState: MockUserState, assetId: AssetId): void {
    const supply = getUserSupply(userState, assetId);
    if (!supply) {
      return;
    }
    const baseApy = Math.max(0, supply.apy - SUPPLY_APY_BONUS);
    const rewardApy = SUPPLY_REWARD_APY;
    supply.apy = baseApy + rewardApy;
    supply.apyBreakdown = {
      baseApy,
      rewardApy,
      totalApy: supply.apy,
      rewards: [
        {
          tokenSymbol: "VELK",
          source: "Velkonix Liquidity Mining",
          apy: rewardApy * SUPPLY_REWARD_VELK_SHARE,
        },
        {
          tokenSymbol: "ARB",
          source: "Arbitrum Ecosystem Boost",
          apy: rewardApy * SUPPLY_REWARD_ARB_SHARE,
        },
      ],
    };
  }

  private syncBorrowApy(userState: MockUserState, assetId: AssetId): void {
    const borrow = getUserBorrow(userState, assetId);
    if (!borrow) {
      return;
    }
    const baseApy = Math.max(0, borrow.apy - VARIABLE_DEBT_APY_BONUS);
    const rewardApy = BORROW_REWARD_APY;
    borrow.apy = Math.max(0, baseApy - rewardApy);
    borrow.apyBreakdown = {
      baseApy,
      rewardApy: -rewardApy,
      totalApy: borrow.apy,
      rewards: [
        {
          tokenSymbol: "VELK",
          source: "Velkonix Borrow Incentives",
          apy: -rewardApy,
        },
      ],
    };
  }

  private applySupply(
    state: MockDbState,
    userState: MockUserState,
    assetId: AssetId,
    amount: number
  ): void {
    const balance = userState.balances[assetId] ?? 0;
    if (balance < amount) {
      throwMockError("INSUFFICIENT_BALANCE", "Insufficient wallet balance");
    }
    const allowance = userState.allowances[assetId] ?? 0;
    if (allowance < amount) {
      throwMockError("INSUFFICIENT_BALANCE", "Approve required");
    }

    const asset = getAssetOrThrow(state, assetId);
    userState.balances[assetId] = balance - amount;
    userState.allowances[assetId] = allowance - amount;

    const supply = getUserSupply(userState, assetId);
    if (supply) {
      supply.balance += amount;
    } else {
      userState.supplies.push({
        assetId,
        balance: amount,
        apy: asset.supplyApy + SUPPLY_APY_BONUS,
        apyBreakdown: {
          baseApy: asset.supplyApy,
          rewardApy: SUPPLY_REWARD_APY,
          totalApy: asset.supplyApy + SUPPLY_REWARD_APY,
          rewards: [
            {
              tokenSymbol: "VELK",
              source: "Velkonix Liquidity Mining",
              apy: SUPPLY_REWARD_APY * SUPPLY_REWARD_VELK_SHARE,
            },
            {
              tokenSymbol: "ARB",
              source: "Arbitrum Ecosystem Boost",
              apy: SUPPLY_REWARD_APY * SUPPLY_REWARD_ARB_SHARE,
            },
          ],
        },
        isCollateral: true,
      });
    }

    asset.totalSupplied += amount;
    userState.lendingRewards += amount * REWARD_ACCRUAL_PER_SUPPLY;
    userState.lendingRewardsByToken.VELK =
      (userState.lendingRewardsByToken.VELK ?? 0) +
      amount * REWARD_ACCRUAL_PER_SUPPLY * SUPPLY_REWARD_VELK_SHARE;
    userState.lendingRewardsByToken.ARB =
      (userState.lendingRewardsByToken.ARB ?? 0) +
      amount * REWARD_ACCRUAL_PER_SUPPLY * SUPPLY_REWARD_ARB_SHARE;
    this.syncSupplyApy(userState, assetId);
  }

  private applyWithdraw(
    state: MockDbState,
    userState: MockUserState,
    assetId: AssetId,
    amount: number
  ): void {
    const supply = getUserSupply(userState, assetId);
    if (supply === undefined || supply.balance < amount) {
      throwMockError("INSUFFICIENT_SUPPLY", "Insufficient supplied balance");
    }
    const currentSupply = supply as NonNullable<typeof supply>;
    const asset = getAssetOrThrow(state, assetId);

    currentSupply.balance -= amount;
    if (currentSupply.balance === 0) {
      userState.supplies = userState.supplies.filter((item) => item.assetId !== assetId);
    } else {
      this.syncSupplyApy(userState, assetId);
    }
    userState.balances[assetId] = (userState.balances[assetId] ?? 0) + amount;
    asset.totalSupplied = Math.max(0, asset.totalSupplied - amount);
  }

  private applyBorrow(
    state: MockDbState,
    userState: MockUserState,
    assetId: AssetId,
    amount: number
  ): void {
    const asset = getAssetOrThrow(state, assetId);
    const borrow = getUserBorrow(userState, assetId);

    if (borrow) {
      borrow.debt += amount;
    } else {
      userState.borrows.push({
        assetId,
        debt: amount,
        apy: asset.borrowApy + VARIABLE_DEBT_APY_BONUS,
        apyBreakdown: {
          baseApy: asset.borrowApy,
          rewardApy: -BORROW_REWARD_APY,
          totalApy: Math.max(0, asset.borrowApy - BORROW_REWARD_APY),
          rewards: [
            {
              tokenSymbol: "VELK",
              source: "Velkonix Borrow Incentives",
              apy: -BORROW_REWARD_APY,
            },
          ],
        },
      });
    }

    userState.balances[assetId] = (userState.balances[assetId] ?? 0) + amount;
    asset.totalBorrowed += amount;
    this.syncBorrowApy(userState, assetId);
  }

  private applyRepay(
    state: MockDbState,
    userState: MockUserState,
    assetId: AssetId,
    amount: number
  ): void {
    const debt = getUserBorrow(userState, assetId);
    if (debt === undefined || debt.debt <= 0) {
      throwMockError("INSUFFICIENT_DEBT", "No debt to repay");
    }
    const currentDebt = debt as NonNullable<typeof debt>;
    const walletBalance = userState.balances[assetId] ?? 0;
    const repayAmount = Math.min(amount, currentDebt.debt);
    if (walletBalance < repayAmount) {
      throwMockError("INSUFFICIENT_BALANCE", "Insufficient wallet balance");
    }

    const asset = getAssetOrThrow(state, assetId);
    currentDebt.debt -= repayAmount;
    if (currentDebt.debt === 0) {
      userState.borrows = userState.borrows.filter((item) => item.assetId !== assetId);
    } else {
      this.syncBorrowApy(userState, assetId);
    }
    userState.balances[assetId] = walletBalance - repayAmount;
    asset.totalBorrowed = Math.max(0, asset.totalBorrowed - repayAmount);
  }
}
