import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLendingController } from "../features/lending";
import { useReserveHistory } from "../features/subgraph";
import { getActiveNetworkConfig } from "../config/networks";
import {
  ActionButton,
  AmountInput,
  BackButton,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Loader,
  Modal,
  MetricText,
  PanelHeader,
  PageContainer,
  Section,
  Table,
  Tabs,
  TimeSeriesChart,
  TxToast,
  Typography,
  ValueCell,
  WideSwitch,
  WalletBalanceCard,
  Checkbox,
} from "../shared/ui";
import { getAssetIconBySymbol } from "../shared/lib/assetIcons";
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./AssetPage.module.css";

type PositionRow = {
  metric: string;
  value: string;
};

type InfoTabId = "supply" | "borrow";

const formatTokenAmount = (value: number, symbol: string): string =>
  `${formatNumber(value)} ${symbol}`;
const formatUsdAmount = (value: number): string => `$${formatNumber(value)}`;
const formatOptionalUsdAmount = (value: number | null | undefined): string =>
  value === null || value === undefined ? "N/A" : formatUsdAmount(value);
const formatHealthFactor = (value: number): string =>
  formatNumber(value, { decimals: 2, compact: false });
const formatPercent = (value: number): string =>
  `${formatNumber(value, { decimals: 2, compact: false })}%`;
const formatInputAmount = (value: number): string =>
  formatNumber(value, { compact: false, useGrouping: false });
const HEALTH_FACTOR_SAFE_THRESHOLD = 3;
const HEALTH_FACTOR_RISK_CONFIRMATION_THRESHOLD = 1.5;
const HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getHealthFactorTextStyle = (value: number): CSSProperties => {
  if (!Number.isFinite(value)) {
    return { color: "var(--success)" };
  }
  if (value <= HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
    return { color: "var(--error)" };
  }
  if (value >= HEALTH_FACTOR_SAFE_THRESHOLD) {
    return { color: "var(--success)" };
  }
  const normalized = clamp(
    (value - HEALTH_FACTOR_LIQUIDATION_THRESHOLD) /
      (HEALTH_FACTOR_SAFE_THRESHOLD - HEALTH_FACTOR_LIQUIDATION_THRESHOLD),
    0,
    1
  );
  const hue = Math.round(normalized * 120);
  return { color: `hsl(${hue} 78% 58%)` };
};

export function AssetPage() {
  const navigate = useNavigate();
  const { assetId = "" } = useParams<{ assetId: string }>();
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTabId>("supply");
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isSupplyTxPending, setIsSupplyTxPending] = useState(false);
  const [isBorrowRiskAccepted, setIsBorrowRiskAccepted] = useState(false);
  const [wethDisplayUnit, setWethDisplayUnit] = useState<"weth" | "eth">("weth");

  const {
    wallet,
    busyOp,
    lastError,
    toast,
    isLoading,
    dashboardSummary,
    userAccountMetrics,
    getAssetById,
    getSupplyForAsset,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    getWalletBalanceUsdForAsset,
    getNativeBalance,
    getNativeBalanceUsd,
    approve,
    supply,
    supplyWithNativeEth,
    borrow,
    clearToast,
  } = useLendingController();

  const asset = getAssetById(assetId);
  const allowance = getAllowanceForAsset(assetId);

  const parsedSupplyAmount = Number(supplyAmount);
  const normalizedSupplyAmount =
    Number.isFinite(parsedSupplyAmount) && parsedSupplyAmount > 0 ? parsedSupplyAmount : 0;
  const parsedBorrowAmount = Number(borrowAmount);
  const normalizedBorrowAmount =
    Number.isFinite(parsedBorrowAmount) && parsedBorrowAmount > 0 ? parsedBorrowAmount : 0;

  const walletBalance = asset ? getWalletBalanceForAsset(asset.id) : 0;
  const walletBalanceUsd = asset ? getWalletBalanceUsdForAsset(asset.id) : null;
  const nativeBalance = getNativeBalance();
  const nativeBalanceUsd = getNativeBalanceUsd();
  const assetSupplyPosition = asset ? getSupplyForAsset(asset.id) : null;
  const isAssetCollateralEnabled = assetSupplyPosition ? assetSupplyPosition.isCollateral : true;
  const oraclePrice = asset?.oraclePrice;
  const hasOraclePrice =
    oraclePrice !== undefined && Number.isFinite(oraclePrice) && oraclePrice > 0;
  const availableToSupply = walletBalance;
  const reserveAvailableLiquidity = Math.max(
    0,
    (asset?.totalSupplied ?? 0) - (asset?.totalBorrowed ?? 0)
  );
  const borrowCapRemaining =
    asset?.borrowCap && asset.borrowCap > 0
      ? Math.max(0, asset.borrowCap - (asset?.totalBorrowed ?? 0))
      : Number.POSITIVE_INFINITY;
  const protocolBorrowLimit = Math.min(reserveAvailableLiquidity, borrowCapRemaining);
  const userBorrowLimitByAccountData =
    userAccountMetrics !== null && userAccountMetrics.baseCurrencyUnit > 0 && hasOraclePrice
      ? Math.max(
          0,
          userAccountMetrics.availableBorrowsBase /
            userAccountMetrics.baseCurrencyUnit /
            Number(oraclePrice)
        )
      : Number.POSITIVE_INFINITY;
  const availableToBorrow = Math.max(
    0,
    Math.min(protocolBorrowLimit, userBorrowLimitByAccountData)
  );
  const reserveSize = Math.max(0, (asset?.totalSupplied ?? 0) - (asset?.totalBorrowed ?? 0));
  const reserveSizeUsd =
    asset?.availableLiquidityUsd ?? (hasOraclePrice ? reserveSize * oraclePrice : null);
  const supplyAmountUsd = hasOraclePrice ? normalizedSupplyAmount * oraclePrice : null;
  const borrowAmountUsd = hasOraclePrice ? normalizedBorrowAmount * oraclePrice : null;
  const exceedsBorrowLimit = normalizedBorrowAmount > availableToBorrow;

  const fallbackTotalSuppliedBefore = dashboardSummary.totalSupplied;
  const fallbackTotalBorrowedBefore = dashboardSummary.totalBorrowed;
  const fallbackCurrentHealthFactor =
    fallbackTotalBorrowedBefore > 0
      ? fallbackTotalSuppliedBefore / fallbackTotalBorrowedBefore
      : Number.POSITIVE_INFINITY;
  const fallbackSupplyHealthFactorAfter =
    fallbackTotalBorrowedBefore > 0
      ? (fallbackTotalSuppliedBefore + normalizedSupplyAmount) / fallbackTotalBorrowedBefore
      : Number.POSITIVE_INFINITY;
  const fallbackBorrowHealthFactorAfter =
    fallbackTotalBorrowedBefore + normalizedBorrowAmount > 0
      ? fallbackTotalSuppliedBefore / (fallbackTotalBorrowedBefore + normalizedBorrowAmount)
      : Number.POSITIVE_INFINITY;

  const canUseRealHealthFactor =
    userAccountMetrics !== null && userAccountMetrics.baseCurrencyUnit > 0;
  const toBaseAmount = (usdAmount: number | null): number =>
    canUseRealHealthFactor && usdAmount !== null
      ? usdAmount * userAccountMetrics.baseCurrencyUnit
      : 0;
  const projectHealthFactor = (collateralDeltaBase: number, debtDeltaBase: number): number => {
    if (!canUseRealHealthFactor) {
      return Number.POSITIVE_INFINITY;
    }
    const totalDebtAfter = Math.max(0, userAccountMetrics.totalDebtBase + debtDeltaBase);
    if (totalDebtAfter <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    const totalCollateralAfter = Math.max(
      0,
      userAccountMetrics.totalCollateralBase + collateralDeltaBase
    );
    return (
      (totalCollateralAfter * (userAccountMetrics.currentLiquidationThreshold / 10_000)) /
      totalDebtAfter
    );
  };

  const currentHealthFactor = canUseRealHealthFactor
    ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
    : fallbackCurrentHealthFactor;
  const supplyHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(isAssetCollateralEnabled ? toBaseAmount(supplyAmountUsd) : 0, 0)
    : fallbackSupplyHealthFactorAfter;
  const borrowHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(0, toBaseAmount(borrowAmountUsd))
    : fallbackBorrowHealthFactorAfter;
  const requiresBorrowRiskConfirmation =
    normalizedBorrowAmount > 0 &&
    Number.isFinite(borrowHealthFactorAfter) &&
    borrowHealthFactorAfter < HEALTH_FACTOR_RISK_CONFIRMATION_THRESHOLD;
  const utilizationRate =
    asset && asset.totalSupplied > 0 ? (asset.totalBorrowed / asset.totalSupplied) * 100 : 0;

  const supplyRows = useMemo<PositionRow[]>(
    () =>
      asset
        ? [
            { metric: "Supply APY", value: formatPercent(asset.supplyApy) },
            {
              metric: "Total supplied",
              value: `${formatTokenAmount(asset.totalSupplied, asset.symbol)} (${formatOptionalUsdAmount(asset.totalSuppliedUsd)})`,
            },
            { metric: "Utilization Rate", value: formatPercent(utilizationRate) },
            { metric: "Max LTV", value: formatPercent(asset.maxLtv ?? 0) },
            {
              metric: "Liquidation threshold",
              value: formatPercent(asset.liquidationThreshold ?? 0),
            },
            { metric: "Liquidation penalty", value: formatPercent(asset.liquidationPenalty ?? 0) },
            {
              metric: "Oracle price",
              value: asset.oraclePrice !== undefined ? formatUsdAmount(asset.oraclePrice) : "N/A",
            },
          ]
        : [],
    [asset, utilizationRate]
  );

  const borrowRows = useMemo<PositionRow[]>(
    () =>
      asset
        ? [
            { metric: "Borrow APY", value: formatPercent(asset.borrowApy) },
            {
              metric: "Total borrowed",
              value: `${formatTokenAmount(asset.totalBorrowed, asset.symbol)} (${formatOptionalUsdAmount(asset.totalBorrowedUsd)})`,
            },
            {
              metric: "Borrow cap",
              value: `${formatTokenAmount(asset.borrowCap ?? 0, asset.symbol)} (${formatOptionalUsdAmount(asset.borrowCapUsd)})`,
            },
            { metric: "Reserve factor", value: formatPercent(asset.reserveFactor ?? 0) },
          ]
        : [],
    [asset]
  );
  const underlyingAsset = useMemo(() => {
    if (!asset) return undefined;
    const networkAsset = getActiveNetworkConfig().assets.find((a) => a.id === asset.id);
    return networkAsset?.address;
  }, [asset?.id]);
  const reserveHistory = useReserveHistory(underlyingAsset, 30);
  const subgraphSupplySeries = useMemo(
    () => (reserveHistory.data ?? []).map((p) => ({ date: p.date, value: p.supplyApy })),
    [reserveHistory.data]
  );
  const subgraphBorrowSeries = useMemo(
    () => (reserveHistory.data ?? []).map((p) => ({ date: p.date, value: p.borrowApy })),
    [reserveHistory.data]
  );
  const supplyRateSeries = subgraphSupplySeries;
  const borrowRateSeries = subgraphBorrowSeries;
  const activeRows = activeInfoTab === "supply" ? supplyRows : borrowRows;
  const activeSeries = activeInfoTab === "supply" ? supplyRateSeries : borrowRateSeries;
  const activeTabLabel = activeInfoTab === "supply" ? "Supply" : "Borrow";
  const activeRateTitle = activeInfoTab === "supply" ? "Supply Rate" : "Borrow Rate";

  useEffect(() => {
    if (!isSupplyTxPending || busyOp === "supply") {
      return;
    }
    if (busyOp !== null) {
      return;
    }
    if (toast?.tone === "success" && toast.title === "SUPPLY success") {
      setIsSupplyModalOpen(false);
      setSupplyAmount("");
    }
    setIsSupplyTxPending(false);
  }, [busyOp, isSupplyTxPending, toast]);

  if (isLoading) {
    return (
      <PageContainer>
        <Loader fullPage label="Loading asset data..." />
      </PageContainer>
    );
  }

  if (wallet.isConnected && wallet.isWrongNetwork) {
    return (
      <PageContainer>
        <ErrorState
          title="Wrong network"
          description={`Switch wallet network to chain ${wallet.expectedChainId ?? "configured network"} to open asset details.`}
        />
        <ActionButton label="Switch network" onClick={() => void wallet.switchNetwork()} />
      </PageContainer>
    );
  }

  if (!asset) {
    return (
      <PageContainer>
        <ErrorState title="Asset not found" description="The selected asset does not exist." />
      </PageContainer>
    );
  }

  const assetIconUrl = getAssetIconBySymbol(asset.symbol);
  const isWethAsset = asset.symbol.toUpperCase() === "WETH";
  const displayAssetSymbol = isWethAsset && wethDisplayUnit === "eth" ? "ETH" : asset.symbol;
  const usesNativeEthDisplay = isWethAsset && wethDisplayUnit === "eth";
  const displayWalletBalance = usesNativeEthDisplay ? nativeBalance : walletBalance;
  const displayWalletBalanceUsd = usesNativeEthDisplay ? nativeBalanceUsd : walletBalanceUsd;
  const displayAvailableToSupply = usesNativeEthDisplay ? nativeBalance : availableToSupply;
  const displayAvailableToBorrow = availableToBorrow;
  const requiresApproval =
    !usesNativeEthDisplay && normalizedSupplyAmount > 0 && allowance < normalizedSupplyAmount;
  const exceedsSupplyLimit = normalizedSupplyAmount > displayAvailableToSupply;

  return (
    <PageContainer className={styles.page}>
      <div className={styles.backRow}>
        <BackButton onClick={() => navigate("/markets")}>Back to Markets</BackButton>
      </div>
      <div className={styles.assetHeaderRow}>
        <MetricText
          title={asset.name}
          value={asset.symbol}
          className={styles.assetTitle}
          icon={
            assetIconUrl ? (
              <img src={assetIconUrl} alt={`${asset.symbol} icon`} />
            ) : (
              asset.symbol.slice(0, 1)
            )
          }
          iconAlt={`${asset.symbol} icon`}
        />
        <MetricText
          title="Reserve size"
          value={formatOptionalUsdAmount(reserveSizeUsd)}
          className={styles.reserveSizeMetric}
          role="status"
          aria-label="Reserve size"
        />
      </div>

      {toast ? (
        <TxToast
          tone={toast.tone}
          title={toast.title}
          message={toast.message}
          txUrl={toast.txUrl}
          onClose={clearToast}
        />
      ) : null}
      {lastError ? (
        <Typography muted role="status">
          Last error: {lastError}
        </Typography>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.infoColumn}>
          <Section>
            <Card className={styles.infoCard}>
              <PanelHeader title="Asset info" />
              <Tabs
                items={[
                  { id: "supply", label: "Supply info" },
                  { id: "borrow", label: "Borrow info" },
                ]}
                activeId={activeInfoTab}
                onChange={(id) => setActiveInfoTab(id as InfoTabId)}
              />
              <div className={styles.rateChart}>
                {activeSeries.length > 0 ? (
                  <TimeSeriesChart
                    data={activeSeries}
                    title={activeRateTitle}
                    ariaLabel={`${asset.symbol} ${activeTabLabel} Rate chart`}
                    height={200}
                    valueFormatter={formatPercent}
                  />
                ) : (
                  <EmptyState
                    title="No rate history yet"
                    description="Historical rates appear once the subgraph is configured for this network."
                  />
                )}
              </div>
              <Table
                className={styles.infoTable}
                hideHeader
                borderless
                columns={[
                  { key: "metric", title: "Metric" },
                  {
                    key: "value",
                    title: "Value",
                    align: "right",
                    render: (row) => <ValueCell>{row.value}</ValueCell>,
                  },
                ]}
                rows={activeRows}
                getRowKey={(row) => row.metric}
              />
            </Card>
          </Section>
        </div>

        <aside className={styles.actionsColumn}>
          <Section>
            <Card className={styles.actionsCard}>
              <PanelHeader title="User Info" />
              {isWethAsset ? (
                <WideSwitch
                  ariaLabel="Asset denomination"
                  value={wethDisplayUnit}
                  options={
                    [
                      { value: "weth", label: "WETH" },
                      { value: "eth", label: "ETH" },
                    ] as const
                  }
                  onChange={setWethDisplayUnit}
                />
              ) : null}
              <WalletBalanceCard
                value={`${formatTokenAmount(displayWalletBalance, displayAssetSymbol)} (${formatOptionalUsdAmount(displayWalletBalanceUsd)})`}
              />

              <Divider />

              <div className={styles.actionRow}>
                <div className={styles.actionText}>
                  <Typography as="p" variant="body">
                    Available to supply
                  </Typography>
                  <Typography as="p" variant="body" className={styles.actionValue}>
                    {formatTokenAmount(displayAvailableToSupply, displayAssetSymbol)}
                  </Typography>
                </div>
                <ActionButton
                  label="Supply"
                  disabled={!wallet.isConnected || busyOp !== null || displayAvailableToSupply <= 0}
                  onClick={() => {
                    setSupplyAmount("");
                    setIsSupplyTxPending(false);
                    setIsSupplyModalOpen(true);
                  }}
                />
              </div>

              <div className={styles.actionRow}>
                <div className={styles.actionText}>
                  <Typography as="p" variant="body">
                    Available to borrow
                  </Typography>
                  <Typography as="p" variant="body" className={styles.actionValue}>
                    {formatTokenAmount(displayAvailableToBorrow, displayAssetSymbol)}
                  </Typography>
                </div>
                <ActionButton
                  label="Borrow"
                  disabled={!wallet.isConnected || busyOp !== null || availableToBorrow <= 0}
                  onClick={() => {
                    setBorrowAmount("");
                    setIsBorrowRiskAccepted(false);
                    setIsBorrowModalOpen(true);
                  }}
                />
              </div>

              {!wallet.isConnected ? (
                <Typography muted>Connect wallet to start supply and borrow operations.</Typography>
              ) : null}
            </Card>
          </Section>
        </aside>
      </div>

      <Modal
        isOpen={isSupplyModalOpen}
        size="xs"
        title={`Supply ${displayAssetSymbol}`}
        onClose={() => setIsSupplyModalOpen(false)}
      >
        <div className={styles.modalContent}>
          <AmountInput
            label="Supply amount"
            value={supplyAmount}
            onChange={(event) => setSupplyAmount(event.target.value)}
            placeholder="0.00"
            assetLabel={displayAssetSymbol}
            balanceLabel="Available"
            balanceValue={formatInputAmount(displayAvailableToSupply)}
            maxValue={displayAvailableToSupply}
            usdValue={formatOptionalUsdAmount(supplyAmountUsd)}
          />
          <div className={styles.txOverview}>
            <Typography as="p" variant="label" className={styles.txOverviewTitle}>
              Transaction overview
            </Typography>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Supply APY
              </Typography>
              <Typography as="span">{formatPercent(asset.supplyApy)}</Typography>
            </div>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Health factor
              </Typography>
              <Typography as="span" className={styles.healthFactorFlow}>
                <span style={getHealthFactorTextStyle(currentHealthFactor)}>
                  {formatHealthFactor(currentHealthFactor)}
                </span>
                <span className={styles.healthFactorArrow}>&rarr;</span>
                <span style={getHealthFactorTextStyle(supplyHealthFactorAfter)}>
                  {formatHealthFactor(supplyHealthFactorAfter)}
                </span>
              </Typography>
            </div>
          </div>
          {exceedsSupplyLimit ? (
            <Typography muted role="status">
              Supply amount exceeds available balance.
            </Typography>
          ) : null}
          <ActionButton
            label={
              busyOp === "approve"
                ? "Approving..."
                : busyOp === "supply"
                  ? "Depositing..."
                  : requiresApproval
                    ? "Approve"
                    : "Deposit"
            }
            isLoading={busyOp === "approve" || busyOp === "supply"}
            disabled={
              !wallet.isConnected ||
              busyOp !== null ||
              normalizedSupplyAmount <= 0 ||
              exceedsSupplyLimit
            }
            onClick={() => {
              if (usesNativeEthDisplay) {
                setIsSupplyTxPending(true);
                void supplyWithNativeEth(asset.id, supplyAmount);
                return;
              }
              if (requiresApproval) {
                void approve(asset.id, supplyAmount);
                return;
              }
              setIsSupplyTxPending(true);
              void supply(asset.id, supplyAmount);
            }}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isBorrowModalOpen}
        size="xs"
        title={`Borrow ${asset.symbol}`}
        onClose={() => setIsBorrowModalOpen(false)}
      >
        <div className={styles.modalContent}>
          <AmountInput
            label="Borrow amount"
            value={borrowAmount}
            onChange={(event) => setBorrowAmount(event.target.value)}
            placeholder="0.00"
            assetLabel={asset.symbol}
            balanceLabel="Available to borrow"
            balanceValue={formatInputAmount(availableToBorrow)}
            maxValue={availableToBorrow}
            usdValue={formatOptionalUsdAmount(borrowAmountUsd)}
          />
          <div className={styles.txOverview}>
            <Typography as="p" variant="label" className={styles.txOverviewTitle}>
              Transaction overview
            </Typography>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Borrow APY
              </Typography>
              <Typography as="span">{formatPercent(asset.borrowApy)}</Typography>
            </div>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Health factor
              </Typography>
              <Typography as="span" className={styles.healthFactorFlow}>
                <span style={getHealthFactorTextStyle(currentHealthFactor)}>
                  {formatHealthFactor(currentHealthFactor)}
                </span>
                <span className={styles.healthFactorArrow}>&rarr;</span>
                <span style={getHealthFactorTextStyle(borrowHealthFactorAfter)}>
                  {formatHealthFactor(borrowHealthFactorAfter)}
                </span>
              </Typography>
            </div>
          </div>
          {requiresBorrowRiskConfirmation ? (
            <div className={styles.riskWarning}>
              <Typography as="p" variant="caption" className={styles.riskWarningTitle}>
                High liquidation risk
              </Typography>
              <Typography as="p" variant="caption" muted>
                Borrowing this amount reduces your health factor below{" "}
                {HEALTH_FACTOR_RISK_CONFIRMATION_THRESHOLD.toFixed(1)}. This can lead to liquidation
                if market conditions move against your position.
              </Typography>
              <Checkbox
                checked={isBorrowRiskAccepted}
                onChange={(event) => setIsBorrowRiskAccepted(event.currentTarget.checked)}
                label="I understand and accept the liquidation risk."
              />
            </div>
          ) : null}
          {exceedsBorrowLimit ? (
            <Typography muted role="status">
              Borrow amount exceeds available liquidity.
            </Typography>
          ) : null}
          <ActionButton
            label={busyOp === "borrow" ? "Borrowing..." : "Borrow"}
            isLoading={busyOp === "borrow"}
            disabled={
              !wallet.isConnected ||
              busyOp !== null ||
              normalizedBorrowAmount <= 0 ||
              exceedsBorrowLimit ||
              (requiresBorrowRiskConfirmation && !isBorrowRiskAccepted)
            }
            onClick={() => void borrow(asset.id, borrowAmount)}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}
