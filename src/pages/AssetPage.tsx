import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLendingController } from "../features/lending";
import {
  ActionButton,
  AmountInput,
  AssetCell,
  BackButton,
  Card,
  Divider,
  ErrorState,
  Icon,
  Modal,
  PageContainer,
  PageHeader,
  Section,
  Table,
  ToastPopup,
  Typography,
  ValueCell,
} from "../shared/ui";
import styles from "./AssetPage.module.css";

type PositionRow = {
  metric: string;
  value: string;
};

const formatTokenAmount = (value: number, symbol: string): string =>
  `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;

const formatHealthFactor = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(2);
};

const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

export function AssetPage() {
  const navigate = useNavigate();
  const { assetId = "" } = useParams<{ assetId: string }>();
  const [supplyAmount, setSupplyAmount] = useState("100");
  const [borrowAmount, setBorrowAmount] = useState("50");
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  const {
    wallet,
    busyOp,
    toast,
    getAssetById,
    getSupplyForAsset,
    getBorrowForAsset,
    getAllowanceForAsset,
    getWalletBalanceForAsset,
    approve,
    supply,
    borrow,
    clearToast,
  } = useLendingController();

  const asset = getAssetById(assetId);
  const supplyPosition = getSupplyForAsset(assetId);
  const borrowPosition = getBorrowForAsset(assetId);
  const allowance = getAllowanceForAsset(assetId);

  const parsedSupplyAmount = Number(supplyAmount);
  const normalizedSupplyAmount = Number.isFinite(parsedSupplyAmount) && parsedSupplyAmount > 0 ? parsedSupplyAmount : 0;
  const parsedBorrowAmount = Number(borrowAmount);
  const normalizedBorrowAmount = Number.isFinite(parsedBorrowAmount) && parsedBorrowAmount > 0 ? parsedBorrowAmount : 0;

  if (!asset) {
    return (
      <PageContainer>
        <ErrorState title="Asset not found" description="The selected asset does not exist." />
      </PageContainer>
    );
  }

  const requiresApproval = normalizedSupplyAmount > 0 && allowance < normalizedSupplyAmount;
  const walletBalance = getWalletBalanceForAsset(asset.id);
  const availableToSupply = walletBalance;
  const availableToBorrow = Math.max(0, asset.totalSupplied - asset.totalBorrowed);
  const currentSupplied = supplyPosition?.balance ?? 0;
  const currentDebt = borrowPosition?.debt ?? 0;
  const supplyHealthFactor = currentDebt > 0 ? (currentSupplied + normalizedSupplyAmount) / currentDebt : Number.POSITIVE_INFINITY;
  const borrowHealthFactor =
    currentDebt + normalizedBorrowAmount > 0 ? currentSupplied / (currentDebt + normalizedBorrowAmount) : Number.POSITIVE_INFINITY;
  const utilizationRate = asset.totalSupplied > 0 ? (asset.totalBorrowed / asset.totalSupplied) * 100 : 0;

  const supplyRows = useMemo<PositionRow[]>(
    () => [
      { metric: "Supply APY", value: formatPercent(asset.supplyApy) },
      { metric: "Total supplied", value: formatTokenAmount(asset.totalSupplied, asset.symbol) },
      { metric: "Utilization Rate", value: formatPercent(utilizationRate) },
      { metric: "Max LTV", value: formatPercent(asset.maxLtv ?? 0) },
      { metric: "Liquidation threshold", value: formatPercent(asset.liquidationThreshold ?? 0) },
      { metric: "Liquidation penalty", value: formatPercent(asset.liquidationPenalty ?? 0) },
    ],
    [asset, utilizationRate]
  );

  const borrowRows = useMemo<PositionRow[]>(
    () => [
      { metric: "Borrow APY", value: formatPercent(asset.borrowApy) },
      { metric: "Total borrowed", value: formatTokenAmount(asset.totalBorrowed, asset.symbol) },
      { metric: "Borrow cap", value: formatTokenAmount(asset.borrowCap ?? 0, asset.symbol) },
      { metric: "Reserve factor", value: formatPercent(asset.reserveFactor ?? 0) },
    ],
    [asset]
  );

  return (
    <PageContainer className={styles.page}>
      <div className={styles.backRow}>
        <BackButton onClick={() => navigate("/markets")}>Back to Markets</BackButton>
      </div>
      <PageHeader
        title={
          <div className={styles.assetTitle}>
            <AssetCell symbol={asset.symbol} name={asset.name} variant="hero" />
          </div>
        }
      />

      {toast ? (
        <ToastPopup tone={toast.tone} title={toast.title} durationMs={5000} onClose={clearToast}>
          {toast.message}
        </ToastPopup>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.infoColumn}>
          <Section>
            <Card>
              <Table
                columns={[
                  { key: "metric", title: "Supply info" },
                  {
                    key: "value",
                    title: "Value",
                    align: "right",
                    render: (row) => <ValueCell>{row.value}</ValueCell>,
                  },
                ]}
                rows={supplyRows}
                getRowKey={(row) => row.metric}
              />
            </Card>
          </Section>

          <Section>
            <Card>
              <Table
                columns={[
                  { key: "metric", title: "Borrow info" },
                  {
                    key: "value",
                    title: "Value",
                    align: "right",
                    render: (row) => <ValueCell>{row.value}</ValueCell>,
                  },
                ]}
                rows={borrowRows}
                getRowKey={(row) => row.metric}
              />
            </Card>
          </Section>
        </div>

        <aside className={styles.actionsColumn}>
          <Section>
            <Card className={styles.actionsCard}>
              <div className={styles.walletModule}>
                <div className={styles.walletIcon}>
                  <Icon size={18} aria-label="Wallet icon" className={styles.walletIconSvg}>
                    <rect x="2.5" y="5" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M11.8 8.4h5v3.2h-5a1.6 1.6 0 1 1 0-3.2Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="13.8" cy="10" r="0.9" fill="currentColor" />
                  </Icon>
                </div>
                <div className={styles.walletSummary}>
                  <Typography as="span" variant="caption" muted>
                    Wallet balance
                  </Typography>
                  <Typography as="p" variant="body" className={styles.walletBalance}>
                    {formatTokenAmount(walletBalance, asset.symbol)}
                  </Typography>
                </div>
              </div>

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
                  disabled={!wallet.isConnected || busyOp !== null}
                  onClick={() => setIsSupplyModalOpen(true)}
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
                  disabled={!wallet.isConnected || busyOp !== null}
                  onClick={() => setIsBorrowModalOpen(true)}
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
            balanceValue={availableToSupply.toFixed(4)}
            maxValue={availableToSupply.toFixed(4)}
          />
          <div className={styles.txOverview}>
            <Typography as="p" variant="label" className={styles.txOverviewTitle}>
              Transaction overview
            </Typography>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Supply APY
              </Typography>
              <Typography as="span">{asset.supplyApy.toFixed(2)}%</Typography>
            </div>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Health factor
              </Typography>
              <Typography as="span">{formatHealthFactor(supplyHealthFactor)}</Typography>
            </div>
          </div>
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
            disabled={!wallet.isConnected || busyOp !== null || normalizedSupplyAmount <= 0}
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
            balanceValue={availableToBorrow.toFixed(4)}
            maxValue={availableToBorrow.toFixed(4)}
          />
          <div className={styles.txOverview}>
            <Typography as="p" variant="label" className={styles.txOverviewTitle}>
              Transaction overview
            </Typography>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Borrow APY
              </Typography>
              <Typography as="span">{asset.borrowApy.toFixed(2)}%</Typography>
            </div>
            <div className={styles.txOverviewRow}>
              <Typography as="span" muted>
                Health factor
              </Typography>
              <Typography as="span">{formatHealthFactor(borrowHealthFactor)}</Typography>
            </div>
          </div>
          <ActionButton
            label={busyOp === "borrow" ? "Borrowing..." : "Borrow"}
            isLoading={busyOp === "borrow"}
            disabled={!wallet.isConnected || busyOp !== null || normalizedBorrowAmount <= 0}
            onClick={() => void borrow(asset.id, borrowAmount)}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}
