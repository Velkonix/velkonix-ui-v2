import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLendingController } from "../features/lending";
import {
  ActionButton,
  AmountInput,
  BackButton,
  Card,
  Divider,
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
  ToastPopup,
  Typography,
  ValueCell,
  WalletBalanceCard,
} from "../shared/ui";
import { getAssetIconBySymbol } from "../shared/lib/assetIcons";
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./AssetPage.module.css";

type PositionRow = {
  metric: string;
  value: string;
};

type InfoTabId = "supply" | "borrow";

const formatTokenAmount = (value: number, symbol: string): string => `${formatNumber(value)} ${symbol}`;
const formatUsdAmount = (value: number): string => `$${formatNumber(value)}`;
const formatOptionalUsdAmount = (value: number | null | undefined): string =>
  value === null || value === undefined ? "N/A" : formatUsdAmount(value);
const formatHealthFactor = (value: number): string => formatNumber(value, { decimals: 2, compact: false });
const formatPercent = (value: number): string => `${formatNumber(value, { decimals: 2, compact: false })}%`;
const formatInputAmount = (value: number): string => formatNumber(value, { compact: false, useGrouping: false });
const RATE_SERIES_LENGTH = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

const seedFromString = (value: string): number =>
  Array.from(value).reduce((accumulator, char, index) => accumulator + char.charCodeAt(0) * (index + 1), 0);

const buildSyntheticRateSeries = (baseRate: number, seedKey: string): Array<{ date: number; value: number }> => {
  const seed = seedFromString(seedKey);
  const now = Date.now();
  return Array.from({ length: RATE_SERIES_LENGTH }, (_, index) => {
    const progress = index / Math.max(1, RATE_SERIES_LENGTH - 1);
    const waveA = Math.sin(index / 11 + seed * 0.01) * 0.28;
    const waveB = Math.cos(index / 23 + seed * 0.03) * 0.16;
    const trend = (progress - 0.5) * 0.2;
    const value = Math.max(0, baseRate + waveA + waveB + trend);
    return {
      date: now - (RATE_SERIES_LENGTH - 1 - index) * DAY_MS,
      value,
    };
  });
};

export function AssetPage() {
  const navigate = useNavigate();
  const { assetId = "" } = useParams<{ assetId: string }>();
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTabId>("supply");
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

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
    approve,
    supply,
    borrow,
    clearToast,
  } = useLendingController();

  const asset = getAssetById(assetId);
  const allowance = getAllowanceForAsset(assetId);

  const parsedSupplyAmount = Number(supplyAmount);
  const normalizedSupplyAmount = Number.isFinite(parsedSupplyAmount) && parsedSupplyAmount > 0 ? parsedSupplyAmount : 0;
  const parsedBorrowAmount = Number(borrowAmount);
  const normalizedBorrowAmount = Number.isFinite(parsedBorrowAmount) && parsedBorrowAmount > 0 ? parsedBorrowAmount : 0;

  const requiresApproval = normalizedSupplyAmount > 0 && allowance < normalizedSupplyAmount;
  const walletBalance = asset ? getWalletBalanceForAsset(asset.id) : 0;
  const walletBalanceUsd = asset ? getWalletBalanceUsdForAsset(asset.id) : null;
  const assetSupplyPosition = asset ? getSupplyForAsset(asset.id) : null;
  const isAssetCollateralEnabled = assetSupplyPosition ? assetSupplyPosition.isCollateral : true;
  const oraclePrice = asset?.oraclePrice;
  const hasOraclePrice = oraclePrice !== undefined && Number.isFinite(oraclePrice) && oraclePrice > 0;
  const availableToSupply = walletBalance;
  const reserveAvailableLiquidity = Math.max(0, (asset?.totalSupplied ?? 0) - (asset?.totalBorrowed ?? 0));
  const borrowCapRemaining =
    asset?.borrowCap && asset.borrowCap > 0 ? Math.max(0, asset.borrowCap - (asset?.totalBorrowed ?? 0)) : Number.POSITIVE_INFINITY;
  const protocolBorrowLimit = Math.min(reserveAvailableLiquidity, borrowCapRemaining);
  const userBorrowLimitByAccountData =
    wallet.mode === "real" && userAccountMetrics !== null && userAccountMetrics.baseCurrencyUnit > 0 && hasOraclePrice
      ? Math.max(0, userAccountMetrics.availableBorrowsBase / userAccountMetrics.baseCurrencyUnit / Number(oraclePrice))
      : Number.POSITIVE_INFINITY;
  const availableToBorrow = Math.max(0, Math.min(protocolBorrowLimit, userBorrowLimitByAccountData));
  const reserveSize = Math.max(0, (asset?.totalSupplied ?? 0) - (asset?.totalBorrowed ?? 0));
  const reserveSizeUsd = asset?.availableLiquidityUsd ?? (hasOraclePrice ? reserveSize * oraclePrice : null);
  const supplyAmountUsd = hasOraclePrice ? normalizedSupplyAmount * oraclePrice : null;
  const borrowAmountUsd = hasOraclePrice ? normalizedBorrowAmount * oraclePrice : null;
  const exceedsSupplyLimit = normalizedSupplyAmount > availableToSupply;
  const exceedsBorrowLimit = normalizedBorrowAmount > availableToBorrow;

  const fallbackTotalSuppliedBefore = dashboardSummary.totalSupplied;
  const fallbackTotalBorrowedBefore = dashboardSummary.totalBorrowed;
  const fallbackCurrentHealthFactor =
    fallbackTotalBorrowedBefore > 0 ? fallbackTotalSuppliedBefore / fallbackTotalBorrowedBefore : Number.POSITIVE_INFINITY;
  const fallbackSupplyHealthFactorAfter =
    fallbackTotalBorrowedBefore > 0
      ? (fallbackTotalSuppliedBefore + normalizedSupplyAmount) / fallbackTotalBorrowedBefore
      : Number.POSITIVE_INFINITY;
  const fallbackBorrowHealthFactorAfter =
    fallbackTotalBorrowedBefore + normalizedBorrowAmount > 0
      ? fallbackTotalSuppliedBefore / (fallbackTotalBorrowedBefore + normalizedBorrowAmount)
      : Number.POSITIVE_INFINITY;

  const canUseRealHealthFactor =
    wallet.mode === "real" && userAccountMetrics !== null && userAccountMetrics.baseCurrencyUnit > 0;
  const toBaseAmount = (usdAmount: number | null): number =>
    canUseRealHealthFactor && usdAmount !== null ? usdAmount * userAccountMetrics.baseCurrencyUnit : 0;
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

  const currentHealthFactor = canUseRealHealthFactor
    ? (userAccountMetrics.healthFactor ?? Number.POSITIVE_INFINITY)
    : fallbackCurrentHealthFactor;
  const supplyHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(isAssetCollateralEnabled ? toBaseAmount(supplyAmountUsd) : 0, 0)
    : fallbackSupplyHealthFactorAfter;
  const borrowHealthFactorAfter = canUseRealHealthFactor
    ? projectHealthFactor(0, toBaseAmount(borrowAmountUsd))
    : fallbackBorrowHealthFactorAfter;
  const utilizationRate = asset && asset.totalSupplied > 0 ? (asset.totalBorrowed / asset.totalSupplied) * 100 : 0;

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
            { metric: "Liquidation threshold", value: formatPercent(asset.liquidationThreshold ?? 0) },
            { metric: "Liquidation penalty", value: formatPercent(asset.liquidationPenalty ?? 0) },
            { metric: "Oracle price", value: asset.oraclePrice !== undefined ? formatUsdAmount(asset.oraclePrice) : "N/A" },
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
  const supplyRateSeries = useMemo(
    () => (asset ? buildSyntheticRateSeries(asset.supplyApy, `${asset.id}-supply`) : []),
    [asset?.id, asset?.supplyApy]
  );
  const borrowRateSeries = useMemo(
    () => (asset ? buildSyntheticRateSeries(asset.borrowApy, `${asset.id}-borrow`) : []),
    [asset?.id, asset?.borrowApy]
  );
  const activeRows = activeInfoTab === "supply" ? supplyRows : borrowRows;
  const activeSeries = activeInfoTab === "supply" ? supplyRateSeries : borrowRateSeries;
  const activeTabLabel = activeInfoTab === "supply" ? "Supply" : "Borrow";
  const activeRateTitle = activeInfoTab === "supply" ? "Supply Rate" : "Borrow Rate";

  if (isLoading) {
    return (
      <PageContainer>
        <Loader label="Loading asset data..." />
      </PageContainer>
    );
  }

  if (wallet.mode === "real" && wallet.isConnected && wallet.isWrongNetwork) {
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
          icon={assetIconUrl ? <img src={assetIconUrl} alt={`${asset.symbol} icon`} /> : asset.symbol.slice(0, 1)}
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
        <ToastPopup tone={toast.tone} title={toast.title} durationMs={5000} onClose={clearToast}>
          {toast.message}
        </ToastPopup>
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
                <TimeSeriesChart
                  data={activeSeries}
                  title={activeRateTitle}
                  ariaLabel={`${asset.symbol} ${activeTabLabel} Rate chart`}
                  height={200}
                  valueFormatter={formatPercent}
                />
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
              <WalletBalanceCard value={`${formatTokenAmount(walletBalance, asset.symbol)} (${formatOptionalUsdAmount(walletBalanceUsd)})`} />

              <Divider />

              <div className={styles.actionRow}>
                <div className={styles.actionText}>
                  <Typography as="p" variant="body">
                    Available to supply
                  </Typography>
                  <Typography as="p" variant="body" className={styles.actionValue}>
                    {formatTokenAmount(availableToSupply, asset.symbol)}
                  </Typography>
                </div>
                <ActionButton
                  label="Supply"
                  disabled={!wallet.isConnected || busyOp !== null || availableToSupply <= 0}
                  onClick={() => {
                    setSupplyAmount("");
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
                    {formatTokenAmount(availableToBorrow, asset.symbol)}
                  </Typography>
                </div>
                <ActionButton
                  label="Borrow"
                  disabled={!wallet.isConnected || busyOp !== null || availableToBorrow <= 0}
                  onClick={() => {
                    setBorrowAmount("");
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

      <Modal isOpen={isSupplyModalOpen} size="xs" title={`Supply ${asset.symbol}`} onClose={() => setIsSupplyModalOpen(false)}>
        <div className={styles.modalContent}>
          <AmountInput
            label="Supply amount"
            value={supplyAmount}
            onChange={(event) => setSupplyAmount(event.target.value)}
            placeholder="0.00"
            assetLabel={asset.symbol}
            balanceLabel="Available"
            balanceValue={formatInputAmount(availableToSupply)}
            maxValue={availableToSupply}
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
              <Typography as="span">
                {formatHealthFactor(currentHealthFactor)} {"->"} {formatHealthFactor(supplyHealthFactorAfter)}
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
            disabled={!wallet.isConnected || busyOp !== null || normalizedSupplyAmount <= 0 || exceedsSupplyLimit}
            onClick={() => void (requiresApproval ? approve(asset.id, supplyAmount) : supply(asset.id, supplyAmount))}
          />
        </div>
      </Modal>

      <Modal isOpen={isBorrowModalOpen} size="xs" title={`Borrow ${asset.symbol}`} onClose={() => setIsBorrowModalOpen(false)}>
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
              <Typography as="span">
                {formatHealthFactor(currentHealthFactor)} {"->"} {formatHealthFactor(borrowHealthFactorAfter)}
              </Typography>
            </div>
          </div>
          {exceedsBorrowLimit ? (
            <Typography muted role="status">
              Borrow amount exceeds available liquidity.
            </Typography>
          ) : null}
          <ActionButton
            label={busyOp === "borrow" ? "Borrowing..." : "Borrow"}
            isLoading={busyOp === "borrow"}
            disabled={!wallet.isConnected || busyOp !== null || normalizedBorrowAmount <= 0 || exceedsBorrowLimit}
            onClick={() => void borrow(asset.id, borrowAmount)}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}
