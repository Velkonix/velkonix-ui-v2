import { useMemo, useState } from "react";

import { useLendingController } from "../features/lending";
import {
  ActionButton,
  AmountInput,
  AssetCell,
  Card,
  ClaimButton,
  EmptyState,
  Modal,
  PageContainer,
  PageHeader,
  PanelHeader,
  PanelHeaderStat,
  Section,
  Switch,
  Table,
  ToastPopup,
  Typography,
  ValueCell,
} from "../shared/ui";
import styles from "./DashboardPage.module.css";

type WithdrawModalState = {
  assetId: string;
  symbol: string;
  maxAmount: number;
} | null;

type RepayModalState = {
  assetId: string;
  symbol: string;
  maxDebt: number;
} | null;

type CollateralModalState = {
  assetId: string;
  symbol: string;
  supplyBalance: number;
  isCurrentlyEnabled: boolean;
  nextEnabled: boolean;
} | null;

const formatAmount = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatUsd = (value: number): string =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPercent = (value: number): string => `${value.toFixed(2)}%`;
const formatHealthFactor = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(2);
};
const computeHealthFactor = (totalSupplied: number, totalBorrowed: number): number =>
  totalBorrowed > 0 ? totalSupplied / totalBorrowed : Number.POSITIVE_INFINITY;

export function DashboardPage() {
  const {
    wallet,
    busyOp,
    lastError,
    toast,
    dashboardSupplies,
    dashboardBorrows,
    dashboardSummary,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    approve,
    withdraw,
    repay,
    setCollateral,
    claimLendingRewards,
    clearToast,
  } = useLendingController();

  const [withdrawModal, setWithdrawModal] = useState<WithdrawModalState>(null);
  const [repayModal, setRepayModal] = useState<RepayModalState>(null);
  const [collateralModal, setCollateralModal] = useState<CollateralModalState>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("0");
  const [repayAmount, setRepayAmount] = useState("0");

  const parsedWithdrawAmount = Number(withdrawAmount);
  const normalizedWithdrawAmount = Number.isFinite(parsedWithdrawAmount) && parsedWithdrawAmount > 0 ? parsedWithdrawAmount : 0;
  const withdrawExceedsLimit = withdrawModal !== null && normalizedWithdrawAmount > withdrawModal.maxAmount;

  const repayWalletBalance = useMemo(
    () => (repayModal ? getWalletBalanceForAsset(repayModal.assetId) : 0),
    [getWalletBalanceForAsset, repayModal]
  );
  const repayAvailable = useMemo(
    () => (repayModal ? Math.min(repayWalletBalance, repayModal.maxDebt) : 0),
    [repayModal, repayWalletBalance]
  );
  const repayAllowance = useMemo(
    () => (repayModal ? getAllowanceForAsset(repayModal.assetId) : 0),
    [getAllowanceForAsset, repayModal]
  );

  const parsedRepayAmount = Number(repayAmount);
  const normalizedRepayAmount = Number.isFinite(parsedRepayAmount) && parsedRepayAmount > 0 ? parsedRepayAmount : 0;
  const repayExceedsLimit = repayModal !== null && normalizedRepayAmount > repayAvailable;
  const requiresRepayApproval = repayModal !== null && normalizedRepayAmount > 0 && repayAllowance < normalizedRepayAmount;

  const withdrawAmountApplied = withdrawModal ? Math.min(normalizedWithdrawAmount, withdrawModal.maxAmount) : 0;
  const withdrawRemainingSupplyBefore = withdrawModal?.maxAmount ?? 0;
  const withdrawRemainingSupplyAfter = Math.max(0, withdrawRemainingSupplyBefore - withdrawAmountApplied);
  const withdrawHealthFactorBefore = computeHealthFactor(dashboardSummary.totalSupplied, dashboardSummary.totalBorrowed);
  const withdrawHealthFactorAfter = computeHealthFactor(
    Math.max(0, dashboardSummary.totalSupplied - withdrawAmountApplied),
    dashboardSummary.totalBorrowed
  );

  const repayAmountApplied = repayModal ? Math.min(normalizedRepayAmount, repayModal.maxDebt) : 0;
  const repayRemainingDebtBefore = repayModal?.maxDebt ?? 0;
  const repayRemainingDebtAfter = Math.max(0, repayRemainingDebtBefore - repayAmountApplied);
  const repayHealthFactorBefore = computeHealthFactor(dashboardSummary.totalSupplied, dashboardSummary.totalBorrowed);
  const repayHealthFactorAfter = computeHealthFactor(
    dashboardSummary.totalSupplied,
    Math.max(0, dashboardSummary.totalBorrowed - repayAmountApplied)
  );

  const collateralSupplied = useMemo(
    () => dashboardSupplies.reduce((sum, item) => sum + (item.isCollateral ? item.balance : 0), 0),
    [dashboardSupplies]
  );
  const collateralHealthFactorBefore = computeHealthFactor(collateralSupplied, dashboardSummary.totalBorrowed);
  const collateralDelta = collateralModal ? (collateralModal.nextEnabled ? collateralModal.supplyBalance : -collateralModal.supplyBalance) : 0;
  const collateralHealthFactorAfter = computeHealthFactor(
    Math.max(0, collateralSupplied + collateralDelta),
    dashboardSummary.totalBorrowed
  );
  const collateralDisableBlocked = collateralModal !== null && !collateralModal.nextEnabled && collateralHealthFactorAfter < 1;

  const suppliesBalance = useMemo(() => dashboardSupplies.reduce((sum, row) => sum + row.balance, 0), [dashboardSupplies]);
  const suppliesWeightedApy = useMemo(() => {
    if (suppliesBalance <= 0) {
      return 0;
    }
    const weightedSum = dashboardSupplies.reduce((sum, row) => sum + row.balance * row.apy, 0);
    return weightedSum / suppliesBalance;
  }, [dashboardSupplies, suppliesBalance]);

  const borrowsBalance = useMemo(() => dashboardBorrows.reduce((sum, row) => sum + row.debt, 0), [dashboardBorrows]);
  const borrowsWeightedApy = useMemo(() => {
    if (borrowsBalance <= 0) {
      return 0;
    }
    const weightedSum = dashboardBorrows.reduce((sum, row) => sum + row.debt * row.apy, 0);
    return weightedSum / borrowsBalance;
  }, [dashboardBorrows, borrowsBalance]);

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="your positions and protocol exposure"
        titleAs="h2"
        subtitleVariant="label"
        className={styles.pageHeader}
      />

      {toast ? (
        <ToastPopup tone={toast.tone} title={toast.title} durationMs={5000} onClose={clearToast}>
          {toast.message}
        </ToastPopup>
      ) : null}
      {lastError ? (
        <Typography muted role="status">
          Last error: {lastError}
        </Typography>
      ) : null}

      <Section>
        <Card>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <Typography as="span" variant="caption" muted>
                Net worth
              </Typography>
              <Typography as="p" variant="body" className={styles.summaryValue}>
                {formatUsd(dashboardSummary.netWorth)}
              </Typography>
            </div>
            <div className={styles.summaryItem}>
              <Typography as="span" variant="caption" muted>
                Net APY
              </Typography>
              <Typography as="p" variant="body" className={styles.summaryValue}>
                {formatPercent(dashboardSummary.averageApy)}
              </Typography>
            </div>
            <div className={styles.summaryItem}>
              <Typography as="span" variant="caption" muted>
                Health factor
              </Typography>
              <Typography as="p" variant="body" className={styles.summaryValue}>
                {formatPercent(dashboardSummary.borrowUtilization)}
              </Typography>
            </div>
            <div className={styles.summaryItem}>
              <Typography as="span" variant="caption" muted>
                Unclaimed rewards
              </Typography>
              <Typography as="p" variant="body" className={styles.summaryValue}>
                {formatAmount(dashboardSummary.lendingRewards)}
              </Typography>
            </div>
            <div className={styles.claimArea}>
              <ClaimButton
                isLoading={busyOp === "claimLendingRewards"}
                disabled={!wallet.isConnected || busyOp !== null || dashboardSummary.lendingRewards <= 0}
                onClick={() => void claimLendingRewards()}
              />
            </div>
          </div>
        </Card>
      </Section>

      <div className={styles.positionsColumns}>
        <Section className={styles.positionsColumn}>
          <Card>
            <PanelHeader
              title="Your supplies"
              details={
                <>
                  <PanelHeaderStat label="Balance" value={formatAmount(suppliesBalance)} />
                  <PanelHeaderStat label="APY" value={formatPercent(suppliesWeightedApy)} />
                </>
              }
            />
            {dashboardSupplies.length === 0 ? (
              <EmptyState title="No supplied positions" description="Supply assets from Markets or Asset page to see them here." />
            ) : (
              <Table
                columns={[
                  {
                    key: "asset",
                    title: "Asset",
                    render: (row) => <AssetCell symbol={row.symbol} name={row.name} />,
                  },
                  {
                    key: "balance",
                    title: "Balance",
                    align: "right",
                    render: (row) => <ValueCell>{formatAmount(row.balance)}</ValueCell>,
                  },
                  {
                    key: "apy",
                    title: "APY",
                    align: "right",
                    render: (row) => <ValueCell>{formatPercent(row.apy)}</ValueCell>,
                  },
                  {
                    key: "collateral",
                    title: "Collateral",
                    align: "center",
                    render: (row) => (
                      <div className={styles.switchCell}>
                        <Switch
                          checked={row.isCollateral}
                          disabled={!wallet.isConnected || busyOp !== null}
                          onChange={(event) =>
                            setCollateralModal({
                              assetId: row.assetId,
                              symbol: row.symbol,
                              supplyBalance: row.balance,
                              isCurrentlyEnabled: row.isCollateral,
                              nextEnabled: event.target.checked,
                            })
                          }
                          aria-label={`Use ${row.symbol} as collateral`}
                        />
                      </div>
                    ),
                  },
                  {
                    key: "withdraw",
                    title: "",
                    align: "right",
                    render: (row) => (
                      <ActionButton
                        label="Withdraw"
                        size="sm"
                        disabled={!wallet.isConnected || busyOp !== null}
                        onClick={() => {
                          setWithdrawModal({
                            assetId: row.assetId,
                            symbol: row.symbol,
                            maxAmount: row.balance,
                          });
                          setWithdrawAmount(row.balance.toFixed(4));
                        }}
                      />
                    ),
                  },
                ]}
                rows={dashboardSupplies}
                getRowKey={(row) => row.assetId}
              />
            )}
          </Card>
        </Section>

        <Section className={styles.positionsColumn}>
          <Card>
            <PanelHeader
              title="Your borrows"
              details={
                <>
                  <PanelHeaderStat label="Balance" value={formatAmount(borrowsBalance)} />
                  <PanelHeaderStat label="APY" value={formatPercent(borrowsWeightedApy)} />
                </>
              }
            />
            {dashboardBorrows.length === 0 ? (
              <EmptyState title="No borrow positions" description="Borrow assets on the Asset page to manage debt here." />
            ) : (
              <Table
                columns={[
                  {
                    key: "asset",
                    title: "Asset",
                    render: (row) => <AssetCell symbol={row.symbol} name={row.name} />,
                  },
                  {
                    key: "debt",
                    title: "Debt",
                    align: "right",
                    render: (row) => <ValueCell>{formatAmount(row.debt)}</ValueCell>,
                  },
                  {
                    key: "apy",
                    title: "APY",
                    align: "right",
                    render: (row) => <ValueCell>{formatPercent(row.apy)}</ValueCell>,
                  },
                  {
                    key: "repay",
                    title: "",
                    align: "right",
                    render: (row) => (
                      <ActionButton
                        label="Repay"
                        size="sm"
                        disabled={!wallet.isConnected || busyOp !== null}
                        onClick={() => {
                          setRepayModal({
                            assetId: row.assetId,
                            symbol: row.symbol,
                            maxDebt: row.debt,
                          });
                          setRepayAmount(row.debt.toFixed(4));
                        }}
                      />
                    ),
                  },
                ]}
                rows={dashboardBorrows}
                getRowKey={(row) => row.assetId}
              />
            )}
          </Card>
        </Section>
      </div>

      <Modal
        isOpen={collateralModal !== null}
        size="xs"
        title={collateralModal ? `${collateralModal.nextEnabled ? "Enable" : "Disable"} ${collateralModal.symbol} collateral` : ""}
        onClose={() => setCollateralModal(null)}
      >
        {collateralModal ? (
          <div className={styles.modalContent}>
            <div className={styles.txOverview}>
              <Typography as="p" variant="label" className={styles.txOverviewTitle}>
                Transaction overview
              </Typography>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Supply balance
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatAmount(collateralModal.supplyBalance)} {collateralModal.symbol}
                </Typography>
              </div>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Health factor
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatHealthFactor(collateralHealthFactorBefore)} &rarr; {formatHealthFactor(collateralHealthFactorAfter)}
                </Typography>
              </div>
            </div>
            {collateralDisableBlocked ? (
              <Typography muted role="status">
                Cannot disable collateral: resulting health factor would be below 1.00.
              </Typography>
            ) : null}
            <ActionButton
              label={
                busyOp === "setCollateral"
                  ? collateralModal.nextEnabled
                    ? "Enabling..."
                    : "Disabling..."
                  : collateralModal.nextEnabled
                    ? "Enable collateral"
                    : "Disable collateral"
              }
              isLoading={busyOp === "setCollateral"}
              disabled={!wallet.isConnected || busyOp !== null || collateralDisableBlocked}
              onClick={() => void setCollateral(collateralModal.assetId, collateralModal.nextEnabled)}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={withdrawModal !== null}
        size="xs"
        title={withdrawModal ? `Withdraw ${withdrawModal.symbol}` : ""}
        onClose={() => setWithdrawModal(null)}
      >
        {withdrawModal ? (
          <div className={styles.modalContent}>
            <AmountInput
              label="Withdraw amount"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="0.00"
              assetLabel={withdrawModal.symbol}
              balanceLabel="Available"
              balanceValue={withdrawModal.maxAmount.toFixed(4)}
              maxValue={withdrawModal.maxAmount.toFixed(4)}
            />
            <div className={styles.txOverview}>
              <Typography as="p" variant="label" className={styles.txOverviewTitle}>
                Transaction overview
              </Typography>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Remaining supply
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatAmount(withdrawRemainingSupplyBefore)} &rarr; {formatAmount(withdrawRemainingSupplyAfter)} {withdrawModal.symbol}
                </Typography>
              </div>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Health factor
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatHealthFactor(withdrawHealthFactorBefore)} &rarr; {formatHealthFactor(withdrawHealthFactorAfter)}
                </Typography>
              </div>
            </div>
            {withdrawExceedsLimit ? (
              <Typography muted role="status">
                Withdraw amount exceeds supplied balance.
              </Typography>
            ) : null}
            <ActionButton
              label={busyOp === "withdraw" ? "Withdrawing..." : "Withdraw"}
              isLoading={busyOp === "withdraw"}
              disabled={!wallet.isConnected || busyOp !== null || normalizedWithdrawAmount <= 0 || withdrawExceedsLimit}
              onClick={() => void withdraw(withdrawModal.assetId, withdrawAmount)}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={repayModal !== null}
        size="xs"
        title={repayModal ? `Repay ${repayModal.symbol}` : ""}
        onClose={() => setRepayModal(null)}
      >
        {repayModal ? (
          <div className={styles.modalContent}>
            <AmountInput
              label="Repay amount"
              value={repayAmount}
              onChange={(event) => setRepayAmount(event.target.value)}
              placeholder="0.00"
              assetLabel={repayModal.symbol}
              balanceLabel="Available to repay"
              balanceValue={repayAvailable.toFixed(4)}
              maxValue={repayAvailable.toFixed(4)}
            />
            <div className={styles.txOverview}>
              <Typography as="p" variant="label" className={styles.txOverviewTitle}>
                Transaction overview
              </Typography>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Remaining debt
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatAmount(repayRemainingDebtBefore)} &rarr; {formatAmount(repayRemainingDebtAfter)} {repayModal.symbol}
                </Typography>
              </div>
              <div className={styles.txOverviewRow}>
                <Typography as="span" muted>
                  Health factor
                </Typography>
                <Typography as="span" className={styles.txOverviewTransition}>
                  {formatHealthFactor(repayHealthFactorBefore)} &rarr; {formatHealthFactor(repayHealthFactorAfter)}
                </Typography>
              </div>
            </div>
            {repayExceedsLimit ? (
              <Typography muted role="status">
                Repay amount exceeds wallet balance or outstanding debt.
              </Typography>
            ) : null}
            <ActionButton
              label={busyOp === "approve" ? "Approving..." : busyOp === "repay" ? "Repaying..." : requiresRepayApproval ? "Approve" : "Repay"}
              isLoading={busyOp === "approve" || busyOp === "repay"}
              disabled={!wallet.isConnected || busyOp !== null || normalizedRepayAmount <= 0 || repayExceedsLimit}
              onClick={() => void (requiresRepayApproval ? approve(repayModal.assetId, repayAmount) : repay(repayModal.assetId, repayAmount))}
            />
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
