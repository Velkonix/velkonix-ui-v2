import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLendingController } from "../features/lending";
import {
  ActionButton,
  AmountInput,
  AssetCell,
  Card,
  ClaimButton,
  EmptyState,
  Icon,
  Loader,
  MetricTile,
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
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./DashboardPage.module.css";

type WithdrawModalState = {
  assetId: string;
  symbol: string;
  supplyBalance: number;
  maxAmount: number;
  isCollateral: boolean;
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

const formatAmount = (value: number): string => formatNumber(value);
const formatUsd = (value: number): string => `$${formatNumber(value)}`;
const formatUsdOrNa = (value: number | null): string => (value === null ? "N/A" : formatUsd(value));
const formatPercent = (value: number): string => `${formatNumber(value, { decimals: 2, compact: false })}%`;
const getHealthPercent = (healthFactor: number): number => {
  if (!Number.isFinite(healthFactor)) {
    return 100;
  }
  if (healthFactor <= 1) {
    return 0;
  }
  // Maps HF in [1..+inf] to [0..100], where HF=1 is liquidation edge.
  const normalized = (1 - 1 / healthFactor) * 100;
  return Math.max(0, Math.min(100, normalized));
};
const formatHealthFactor = (value: number): string =>
  Number.isFinite(value) ? formatNumber(value, { decimals: 2, compact: false }) : "∞";
const formatHealthFactorWithPercent = (value: number): string => {
  const numeric = Number.isFinite(value) ? formatNumber(value, { decimals: 2, compact: false }) : "∞";
  const healthPercent = formatNumber(getHealthPercent(value), { decimals: 2, compact: false });
  return `${numeric} (${healthPercent}%)`;
};
const formatInputAmount = (value: number): string => formatNumber(value, { compact: false, useGrouping: false });
const computeHealthFactor = (totalSupplied: number, totalBorrowed: number): number =>
  totalBorrowed > 0 ? totalSupplied / totalBorrowed : Number.POSITIVE_INFINITY;
const getAvailableLiquidity = (totalSupplied: number, totalBorrowed: number): number =>
  Math.max(0, totalSupplied - totalBorrowed);

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    wallet,
    busyOp,
    lastError,
    toast,
    isLoading,
    dashboardSupplies,
    dashboardBorrows,
    dashboardSummary,
    userAccountMetrics,
    getAssetById,
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
  const [isCollateralTxPending, setIsCollateralTxPending] = useState(false);
  const [isWithdrawTxPending, setIsWithdrawTxPending] = useState(false);
  const [isRepayTxPending, setIsRepayTxPending] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const parsedWithdrawAmount = Number(withdrawAmount);
  const normalizedWithdrawAmount = Number.isFinite(parsedWithdrawAmount) && parsedWithdrawAmount > 0 ? parsedWithdrawAmount : 0;
  const withdrawExceedsLimit = withdrawModal !== null && normalizedWithdrawAmount > withdrawModal.maxAmount;
  const withdrawBlockedByUtilization =
    withdrawModal !== null && withdrawModal.maxAmount < withdrawModal.supplyBalance;

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
  const withdrawRemainingSupplyBefore = withdrawModal?.supplyBalance ?? 0;
  const withdrawRemainingSupplyAfter = Math.max(0, withdrawRemainingSupplyBefore - withdrawAmountApplied);
  const repayAmountApplied = repayModal ? Math.min(normalizedRepayAmount, repayModal.maxDebt) : 0;
  const repayRemainingDebtBefore = repayModal?.maxDebt ?? 0;
  const repayRemainingDebtAfter = Math.max(0, repayRemainingDebtBefore - repayAmountApplied);
  const fallbackHealthFactor = computeHealthFactor(
    dashboardSupplies.reduce((sum, item) => sum + (item.isCollateral ? item.balance : 0), 0),
    dashboardSummary.totalBorrowed
  );
  const canUseRealHealthFactor =
    wallet.mode === "real" && userAccountMetrics !== null && userAccountMetrics.baseCurrencyUnit > 0;
  const getAssetUsdPrice = (assetId: string): number | null => {
    const asset = getAssetById(assetId);
    if (!asset?.oraclePrice || !Number.isFinite(asset.oraclePrice) || asset.oraclePrice <= 0) {
      return null;
    }
    return asset.oraclePrice;
  };
  const toBaseAmount = (assetId: string, tokenAmount: number): number => {
    if (!canUseRealHealthFactor) {
      return 0;
    }
    const price = getAssetUsdPrice(assetId);
    if (price === null) {
      return 0;
    }
    return tokenAmount * price * userAccountMetrics.baseCurrencyUnit;
  };
  const projectHealthFactor = (collateralDeltaBase: number, debtDeltaBase: number): number => {
    if (!canUseRealHealthFactor) {
      return Number.POSITIVE_INFINITY;
    }
    const totalDebtAfter = Math.max(0, userAccountMetrics.totalDebtBase + debtDeltaBase);
    if (totalDebtAfter <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    const totalCollateralAfter = Math.max(0, userAccountMetrics.totalCollateralBase + collateralDeltaBase);
    return (totalCollateralAfter * (userAccountMetrics.currentLiquidationThreshold / 10_000)) / totalDebtAfter;
  };

  const withdrawHealthFactorBefore = canUseRealHealthFactor
    ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
    : fallbackHealthFactor;
  const withdrawHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(withdrawModal?.isCollateral ? -toBaseAmount(withdrawModal.assetId, withdrawAmountApplied) : 0, 0)
    : computeHealthFactor(Math.max(0, dashboardSummary.totalSupplied - withdrawAmountApplied), dashboardSummary.totalBorrowed);
  const repayHealthFactorBefore = canUseRealHealthFactor
    ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
    : fallbackHealthFactor;
  const repayHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(0, -toBaseAmount(repayModal?.assetId ?? "", repayAmountApplied))
    : computeHealthFactor(dashboardSummary.totalSupplied, Math.max(0, dashboardSummary.totalBorrowed - repayAmountApplied));
  const collateralHealthFactorBefore = canUseRealHealthFactor
    ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
    : computeHealthFactor(
        dashboardSupplies.reduce((sum, item) => sum + (item.isCollateral ? item.balance : 0), 0),
        dashboardSummary.totalBorrowed
      );
  const collateralDeltaBase = collateralModal
    ? toBaseAmount(collateralModal.assetId, collateralModal.nextEnabled ? collateralModal.supplyBalance : -collateralModal.supplyBalance)
    : 0;
  const collateralHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(collateralDeltaBase, 0)
    : computeHealthFactor(
        Math.max(
          0,
          dashboardSupplies.reduce((sum, item) => sum + (item.isCollateral ? item.balance : 0), 0) +
            (collateralModal ? (collateralModal.nextEnabled ? collateralModal.supplyBalance : -collateralModal.supplyBalance) : 0)
        ),
        dashboardSummary.totalBorrowed
      );
  const collateralDisableBlocked = collateralModal !== null && !collateralModal.nextEnabled && collateralHealthFactorAfter < 1;

  useEffect(() => {
    if (!isCollateralTxPending || busyOp === "setCollateral") {
      return;
    }
    if (busyOp !== null) {
      return;
    }
    if (toast?.tone === "success" && toast.title === "SETCOLLATERAL success") {
      setCollateralModal(null);
    }
    setIsCollateralTxPending(false);
  }, [busyOp, isCollateralTxPending, toast]);

  useEffect(() => {
    if (!isWithdrawTxPending || busyOp === "withdraw") {
      return;
    }
    if (busyOp !== null) {
      return;
    }
    if (toast?.tone === "success" && toast.title === "WITHDRAW success") {
      setWithdrawModal(null);
    }
    setIsWithdrawTxPending(false);
  }, [busyOp, isWithdrawTxPending, toast]);

  useEffect(() => {
    if (!isRepayTxPending || busyOp === "repay") {
      return;
    }
    if (busyOp !== null) {
      return;
    }
    if (toast?.tone === "success" && toast.title === "REPAY success") {
      setRepayModal(null);
    }
    setIsRepayTxPending(false);
  }, [busyOp, isRepayTxPending, toast]);

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
    <PageContainer className={styles.page} aria-busy={isLoading}>
      {isLoading ? (
        <Loader fullPage label="Loading dashboard data..." />
      ) : null}
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
        {wallet.mode === "real" && wallet.isConnected && wallet.isWrongNetwork ? (
          <Card>
            <EmptyState
              title="Wrong network"
              description={`Switch wallet network to chain ${wallet.expectedChainId ?? "configured network"} to view dashboard.`}
            />
            <ActionButton label="Switch network" onClick={() => void wallet.switchNetwork()} />
          </Card>
        ) : null}
        <div className={styles.summaryGrid}>
          <MetricTile
            title="Net worth"
            value={formatUsdOrNa(dashboardSummary.netWorthUsd)}
            media={
              <Icon size={18} viewBox="0 0 24 24" aria-label="Net worth icon">
                <path
                  d="M17.67,22.5H6.33A4.83,4.83,0,0,1,1.5,17.67h0a4.83,4.83,0,0,1,1.24-3.23l7.35-8.17h3.82l7.35,8.17a4.83,4.83,0,0,1,1.24,3.23h0A4.83,4.83,0,0,1,17.67,22.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.91"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                />
                <path
                  d="M15.82,1.5l-.39,2A3.49,3.49,0,0,1,12,6.27h0A3.49,3.49,0,0,1,8.57,3.46l-.39-2Z"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.91"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                />
                <path
                  d="M10.09,17.73h2.39a1.43,1.43,0,0,0,1.43-1.43h0a1.43,1.43,0,0,0-1.43-1.44h-1a1.43,1.43,0,0,1-1.43-1.43h0A1.43,1.43,0,0,1,11.52,12h2.39"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.91"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                />
                <line x1="18.68" y1="3.41" x2="14.86" y2="5.32" stroke="currentColor" strokeWidth="1.91" strokeLinecap="square" strokeMiterlimit="10" />
                <line x1="19.64" y1="6.27" x2="13.91" y2="6.27" stroke="currentColor" strokeWidth="1.91" strokeLinecap="square" strokeMiterlimit="10" />
                <line x1="12" y1="11.05" x2="12" y2="12" stroke="currentColor" strokeWidth="1.91" strokeLinecap="square" strokeMiterlimit="10" />
                <line x1="12" y1="17.73" x2="12" y2="18.68" stroke="currentColor" strokeWidth="1.91" strokeLinecap="square" strokeMiterlimit="10" />
              </Icon>
            }
          />
          <MetricTile
            title="Net APY"
            value={formatPercent(dashboardSummary.averageApy)}
            media={
              <Icon size={18} viewBox="0 0 24 24" aria-label="Net APY icon">
                <path
                  d="M18.68,14.86H16.44a5.72,5.72,0,0,0-10.35-.95H5.8a4.3,4.3,0,1,0,0,8.59H18.68a3.82,3.82,0,0,0,0-7.64Z"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.91"
                />
                <path
                  d="M9.14,1.5H11a4.77,4.77,0,0,1,4.77,4.77v0a0,0,0,0,1,0,0H13.91A4.77,4.77,0,0,1,9.14,1.5v0A0,0,0,0,1,9.14,1.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.91"
                />
                <path
                  d="M20.59,1.5H22.5a0,0,0,0,1,0,0v0a4.77,4.77,0,0,1-4.77,4.77H15.82a0,0,0,0,1,0,0v0A4.77,4.77,0,0,1,20.59,1.5Z"
                  transform="translate(38.32 7.77) rotate(-180)"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.91"
                />
                <line
                  x1="15.82"
                  y1="13.91"
                  x2="15.82"
                  y2="6.27"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.91"
                />
              </Icon>
            }
          />
          <MetricTile
            title="Health factor"
            value={formatHealthFactorWithPercent(
              canUseRealHealthFactor
                ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
                : fallbackHealthFactor
            )}
            media={
              <Icon size={18} viewBox="0 0 32 32" aria-label="Health factor icon">
                <path
                  d="M29.125 10.375h-7.5v-7.5c0-1.036-0.839-1.875-1.875-1.875h-7.5c-1.036 0-1.875 0.84-1.875 1.875v7.5h-7.5c-1.036 0-1.875 0.84-1.875 1.875v7.5c0 1.036 0.84 1.875 1.875 1.875h7.5v7.5c0 1.036 0.84 1.875 1.875 1.875h7.5c1.036 0 1.875-0.84 1.875-1.875v-7.5h7.5c1.035 0 1.875-0.839 1.875-1.875v-7.5c0-1.036-0.84-1.875-1.875-1.875z"
                  fill="currentColor"
                />
              </Icon>
            }
          />
          <MetricTile
            title="Unclaimed rewards"
            value={formatAmount(dashboardSummary.lendingRewards)}
            media={
              <Icon size={18} viewBox="0 0 512 512" aria-label="Unclaimed rewards icon">
                <rect x="208.372" y="95.256" width="95.256" height="35.721" fill="currentColor" />
                <path
                  d="M410.791,23.815H101.209C45.402,23.815,0,69.217,0,125.024s45.402,101.209,101.209,101.209h32.692c2.78,8.16,5.757,15.983,8.939,23.408c12.477,29.114,27.794,52.039,45.525,68.14c7.236,6.57,14.818,11.956,22.709,16.183c-9.165,14.095-11.029,31.584-5.584,47.059h-38.792v107.163h178.605V381.023h-38.793c5.445-15.474,3.582-32.964-5.583-47.059c7.891-4.227,15.473-9.613,22.709-16.183c17.732-16.101,33.049-39.026,45.525-68.14c3.182-7.424,6.158-15.248,8.939-23.408h32.692c55.807,0,101.209-45.402,101.209-101.209S466.597,23.815,410.791,23.815z M101.209,190.512c-36.11,0-65.488-29.378-65.488-65.488s29.378-65.488,65.488-65.488h6.173c1.118,47.317,6.676,91.933,16.182,130.977H101.209z M309.581,416.745v35.721H202.419v-35.721H309.581z M243.37,350.535c6.964-6.966,18.295-6.964,25.258,0c6.964,6.963,6.964,18.294,0,25.258c-6.964,6.964-18.294,6.964-25.258,0C236.406,368.829,236.406,357.499,243.37,350.535z M256,309.582c-63.003,0-109.401-104.1-112.903-250.046h225.807C365.401,205.482,319.003,309.582,256,309.582z M410.791,190.512h-22.353c9.504-39.044,15.062-83.66,16.182-130.977h6.171c36.11,0,65.488,29.378,65.488,65.488S446.901,190.512,410.791,190.512z"
                  fill="currentColor"
                />
              </Icon>
            }
            actions={
              <ClaimButton
                isLoading={busyOp === "claimLendingRewards"}
                disabled={!wallet.isConnected || busyOp !== null || dashboardSummary.lendingRewards <= 0}
                onClick={() => void claimLendingRewards()}
              />
            }
          />
        </div>
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
                      <div className={styles.switchCell} onClick={(event) => event.stopPropagation()}>
                        <Switch
                          variant="collateral"
                          checked={row.isCollateral}
                          disabled={!wallet.isConnected || busyOp !== null}
                          onChange={(event) => {
                            event.stopPropagation();
                            setCollateralModal({
                              assetId: row.assetId,
                              symbol: row.symbol,
                              supplyBalance: row.balance,
                              isCurrentlyEnabled: row.isCollateral,
                              nextEnabled: event.target.checked,
                            });
                          }}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          const asset = getAssetById(row.assetId);
                          const liquidityLimit = asset ? getAvailableLiquidity(asset.totalSupplied, asset.totalBorrowed) : row.balance;
                          setWithdrawModal({
                            assetId: row.assetId,
                            symbol: row.symbol,
                            supplyBalance: row.balance,
                            maxAmount: Math.min(row.balance, liquidityLimit),
                            isCollateral: row.isCollateral,
                          });
                          setWithdrawAmount("");
                        }}
                      />
                    ),
                  },
                ]}
                rows={dashboardSupplies}
                getRowKey={(row) => row.assetId}
                onRowClick={(row) => navigate(`/asset/${row.assetId}`)}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          setRepayModal({
                            assetId: row.assetId,
                            symbol: row.symbol,
                            maxDebt: row.debt,
                          });
                          setRepayAmount("");
                        }}
                      />
                    ),
                  },
                ]}
                rows={dashboardBorrows}
                getRowKey={(row) => row.assetId}
                onRowClick={(row) => navigate(`/asset/${row.assetId}`)}
              />
            )}
          </Card>
        </Section>
      </div>

      <Modal
        isOpen={collateralModal !== null}
        size="xs"
        title={collateralModal ? `${collateralModal.nextEnabled ? "Enable" : "Disable"} ${collateralModal.symbol} collateral` : ""}
        onClose={() => {
          setCollateralModal(null);
          setIsCollateralTxPending(false);
        }}
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
              onClick={() => {
                setIsCollateralTxPending(true);
                void setCollateral(collateralModal.assetId, collateralModal.nextEnabled);
              }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={withdrawModal !== null}
        size="xs"
        title={withdrawModal ? `Withdraw ${withdrawModal.symbol}` : ""}
        onClose={() => {
          setWithdrawModal(null);
          setIsWithdrawTxPending(false);
        }}
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
              balanceValue={formatInputAmount(withdrawModal.maxAmount)}
              maxValue={withdrawModal.maxAmount}
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
                {withdrawBlockedByUtilization
                  ? `Withdraw amount exceeds currently available liquidity in the pool due to utilization. Right now you can withdraw up to ${formatAmount(withdrawModal.maxAmount)} ${withdrawModal.symbol}.`
                  : "Withdraw amount exceeds supplied balance."}
              </Typography>
            ) : null}
            <ActionButton
              label={busyOp === "withdraw" ? "Withdrawing..." : "Withdraw"}
              isLoading={busyOp === "withdraw"}
              disabled={!wallet.isConnected || busyOp !== null || normalizedWithdrawAmount <= 0 || withdrawExceedsLimit}
              onClick={() => {
                setIsWithdrawTxPending(true);
                void withdraw(withdrawModal.assetId, withdrawAmount);
              }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={repayModal !== null}
        size="xs"
        title={repayModal ? `Repay ${repayModal.symbol}` : ""}
        onClose={() => {
          setRepayModal(null);
          setIsRepayTxPending(false);
        }}
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
              balanceValue={formatInputAmount(repayAvailable)}
              maxValue={repayAvailable}
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
              onClick={() => {
                if (requiresRepayApproval) {
                  void approve(repayModal.assetId, repayAmount);
                  return;
                }
                setIsRepayTxPending(true);
                void repay(repayModal.assetId, repayAmount);
              }}
            />
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
