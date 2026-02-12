import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLendingController } from "../features/lending";
import {
  ActionButton,
  AssetCell,
  AmountInput,
  BackButton,
  Card,
  Divider,
  ErrorState,
  InfoTableCard,
  Modal,
  PageContainer,
  Section,
  ToastPopup,
  Typography,
  WalletBalanceCard,
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
    lastError,
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
  const exceedsSupplyLimit = normalizedSupplyAmount > availableToSupply;
  const exceedsBorrowLimit = normalizedBorrowAmount > availableToBorrow;
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
      <AssetCell className={styles.assetTitle} symbol={asset.symbol} name={asset.name} iconUrl={asset.iconUrl} />

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
            <InfoTableCard title="Supply info" rows={supplyRows} getRowKey={(row) => row.metric} />
          </Section>

          <Section>
            <InfoTableCard title="Borrow info" rows={borrowRows} getRowKey={(row) => row.metric} />
          </Section>
        </div>

        <aside className={styles.actionsColumn}>
          <Section>
            <Card className={styles.actionsCard}>
              <WalletBalanceCard value={formatTokenAmount(walletBalance, asset.symbol)} />

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
                  disabled={!wallet.isConnected || busyOp !== null || availableToBorrow <= 0}
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
