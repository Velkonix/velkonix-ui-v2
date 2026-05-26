import { useEffect, useMemo, useState } from "react";

import { useWallet } from "../app/providers/WalletProvider";
import { useMockEngine } from "../app/providers/MockEngineProvider";
import type { Address, AssetId, MockTxResult } from "../mock";
import { sendE2EDebugEvent } from "../shared/lib/e2eIngest";
import {
  ActionButton,
  ApproveButton,
  ApyCell,
  AssetCell,
  Card,
  ClaimButton,
  Input,
  PageContainer,
  PageHeader,
  Section,
  Switch,
  Table,
  ToastPopup,
  TxStatus,
  Typography,
  ValueCell,
  WalletConnectButton,
  WalletMenu,
} from "../shared/ui";
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./MockModePage.module.css";

type AssetRow = {
  id: string;
  name: string;
  supplied: number;
  borrowed: number;
  supplyApy: number;
};

const parseAmount = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number): string => formatNumber(value);
const formatPercent = (value: number): string =>
  `${formatNumber(value, { decimals: 2, compact: false })}%`;
const MAX_MOCK_APPROVE_AMOUNT = Number.MAX_SAFE_INTEGER;

type ToastTone = "success" | "error" | "info";

type ToastState = {
  tone: ToastTone;
  title: string;
  message: string;
};

export function MockModePage() {
  const engine = useMockEngine();
  const [amount, setAmount] = useState("100");
  const [selectedAsset, setSelectedAsset] = useState<AssetId>("USDC");
  const [txIds, setTxIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [, setRenderTick] = useState(0);
  const wallet = useWallet();

  const user = wallet.address as Address | null;

  useEffect(() => {
    sendE2EDebugEvent({
      runId: "e2e-debug-1",
      hypothesisId: "H3",
      location: "src/pages/MockModePage.tsx:50",
      message: "MockModePage mounted",
      data: { user },
      timestamp: Date.now(),
    });
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRenderTick((value) => value + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const assets = engine.selectors.getAssets();
  const supplies = user ? engine.selectors.getUserSupplies(user) : [];
  const borrows = user ? engine.selectors.getUserBorrows(user) : [];
  const stakingState = user
    ? engine.selectors.getStakingState(user)
    : {
        velkBalance: 0,
        staked: 0,
        rewards: 0,
        apr: 0,
        instantExitPenaltyBps: 0,
        exitQueue: [],
      };
  const queueEntries = user
    ? engine.selectors
        .getExitQueueEntries(user)
        .filter((item) => item.status === "queued" || item.status === "ready")
    : [];

  useEffect(() => {
    if (!assets.some((asset) => asset.id === selectedAsset) && assets[0]) {
      setSelectedAsset(assets[0].id);
    }
  }, [assets, selectedAsset]);

  const rows = useMemo<AssetRow[]>(
    () =>
      assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        supplied: asset.totalSupplied,
        borrowed: asset.totalBorrowed,
        supplyApy: asset.supplyApy,
      })),
    [assets]
  );

  const recentTxs = useMemo(
    () =>
      txIds
        .map((id) => engine.selectors.getTx(id))
        .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
        .slice(0, 8),
    [engine, txIds]
  );

  const runOperation = async (opName: string, op: () => Promise<MockTxResult>) => {
    if (!user) {
      setToast({
        tone: "error",
        title: "Wallet required",
        message: "Connect wallet before sending transaction.",
      });
      return;
    }
    setBusyOp(opName);
    setToast(null);
    const before = new Set(engine.selectors.getTxPool().map((tx) => tx.id));
    const opPromise = op();

    // run() writes "pending" tx record before awaiting delay, so capture it immediately
    const createdTx = engine.selectors.getTxPool().find((tx) => !before.has(tx.id));
    if (createdTx) {
      setTxIds((prev) => [createdTx.id, ...prev.filter((id) => id !== createdTx.id)]);
    }

    const result = await opPromise;
    setTxIds((prev) => [result.txId, ...prev.filter((id) => id !== result.txId)]);
    if (result.status === "failed") {
      const errorCode = result.error ?? "UNKNOWN_ERROR";
      setToast({
        tone: "error",
        title: `${opName.toUpperCase()} failed`,
        message: errorCode,
      });
    } else {
      setToast({
        tone: "success",
        title: `${opName.toUpperCase()} success`,
        message: `Transaction ${result.txId} completed successfully.`,
      });
    }
    setBusyOp(null);
  };

  const selectedQueueItem = queueEntries[0];
  const numericAmount = parseAmount(amount);

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Velkonix Mock Mode"
        subtitle="Markets, Asset, Dashboard and Staking flows are powered by deterministic mock engine."
        actions={wallet.isConnected ? <WalletMenu /> : <WalletConnectButton />}
      />
      {toast ? (
        <ToastPopup
          tone={toast.tone}
          title={toast.title}
          durationMs={5000}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </ToastPopup>
      ) : null}

      <Section title="Markets">
        <Card>
          <Table<AssetRow>
            columns={[
              {
                key: "asset",
                title: "Asset",
                render: (row) => <AssetCell symbol={row.id} name={row.name} />,
              },
              {
                key: "supplied",
                title: "Total Supplied",
                align: "right",
                render: (row) => <ValueCell>{formatAmount(row.supplied)}</ValueCell>,
              },
              {
                key: "borrowed",
                title: "Total Borrowed",
                align: "right",
                render: (row) => <ValueCell>{formatAmount(row.borrowed)}</ValueCell>,
              },
              {
                key: "apy",
                title: "Supply APY",
                align: "right",
                render: (row) => <ApyCell>{formatPercent(row.supplyApy)}</ApyCell>,
              },
            ]}
            rows={rows}
            getRowKey={(row) => row.id}
          />
        </Card>
      </Section>

      <Section title="Asset Actions">
        <Card>
          <div className={styles.controls}>
            <Input
              label="Asset id"
              value={selectedAsset}
              onChange={(event) => setSelectedAsset(event.target.value)}
            />
            <Input
              label="Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Switch
              variant="collateral"
              label="Use as collateral"
              checked={
                supplies.find((item) => item.assetId === selectedAsset)?.isCollateral ?? false
              }
              disabled={busyOp !== null || !wallet.isConnected}
              onChange={(event) =>
                runOperation("setCollateral", () =>
                  engine.lending.setCollateral(user as Address, selectedAsset, event.target.checked)
                )
              }
            />
          </div>

          <div className={styles.actions}>
            <ApproveButton
              isLoading={busyOp === "approve"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("approve", () =>
                  engine.lending.approve(user as Address, selectedAsset, MAX_MOCK_APPROVE_AMOUNT)
                )
              }
            />
            <ActionButton
              label="Supply"
              isLoading={busyOp === "supply"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("supply", () =>
                  engine.lending.supply(user as Address, selectedAsset, numericAmount)
                )
              }
            />
            <ActionButton
              label="Withdraw"
              isLoading={busyOp === "withdraw"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("withdraw", () =>
                  engine.lending.withdraw(user as Address, selectedAsset, numericAmount)
                )
              }
            />
            <ActionButton
              label="Borrow"
              isLoading={busyOp === "borrow"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("borrow", () =>
                  engine.lending.borrow(user as Address, selectedAsset, numericAmount)
                )
              }
            />
            <ActionButton
              label="Repay"
              isLoading={busyOp === "repay"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("repay", () =>
                  engine.lending.repay(user as Address, selectedAsset, numericAmount)
                )
              }
            />
          </div>
        </Card>
      </Section>

      <Section title="Dashboard">
        <div className={styles.grid}>
          <Card title="Supplies">
            {supplies.length === 0 ? (
              <Typography muted>No supplies yet.</Typography>
            ) : (
              supplies.map((supply) => (
                <Typography key={supply.assetId}>
                  {supply.assetId}: {formatAmount(supply.balance)} ({formatPercent(supply.apy)} APY)
                </Typography>
              ))
            )}
          </Card>
          <Card title="Borrows">
            {borrows.length === 0 ? (
              <Typography muted>No borrows yet.</Typography>
            ) : (
              borrows.map((borrow) => (
                <Typography key={borrow.assetId}>
                  {borrow.assetId}: {formatAmount(borrow.debt)} ({formatPercent(borrow.apy)} APY)
                </Typography>
              ))
            )}
          </Card>
          <Card title="Claim Lending Rewards">
            <ClaimButton
              isLoading={busyOp === "claimLendingRewards"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("claimLendingRewards", () =>
                  engine.lending.claimLendingRewards(user as Address)
                )
              }
            />
          </Card>
        </div>
      </Section>

      <Section title="Staking (Convert / Stake / Rewards / Exit)">
        <Card>
          <Typography>
            Staked: {formatAmount(stakingState.staked)} | Rewards:{" "}
            {formatAmount(stakingState.rewards)} | APR: {formatPercent(stakingState.apr)}
          </Typography>
          <div className={styles.actions}>
            <ActionButton
              label="Convert"
              isLoading={busyOp === "convert"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("convert", () =>
                  engine.staking.convert(user as Address, numericAmount)
                )
              }
            />
            <ActionButton
              label="Stake To Rewards"
              isLoading={busyOp === "stakeToRewards"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("stakeToRewards", () =>
                  engine.staking.stakeToRewards(user as Address, numericAmount)
                )
              }
            />
            <ActionButton
              label="Unstake Rewards"
              isLoading={busyOp === "unstakeFromRewards"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("unstakeFromRewards", () =>
                  engine.staking.unstakeFromRewards(user as Address, numericAmount)
                )
              }
            />
            <ClaimButton
              isLoading={busyOp === "claimStakingRewards"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("claimStakingRewards", () =>
                  engine.staking.claimStakingRewards(user as Address)
                )
              }
            />
            <ActionButton
              label="Instant Exit"
              isLoading={busyOp === "instantExit"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("instantExit", () =>
                  engine.staking.instantExit(user as Address, numericAmount)
                )
              }
            />
            <ActionButton
              label="Vesting Exit"
              isLoading={busyOp === "vestingExit"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("vestingExit", () => engine.staking.vestingExit(user as Address))
              }
            />
            <ActionButton
              label="Request Exit"
              isLoading={busyOp === "requestExit"}
              disabled={busyOp !== null || !wallet.isConnected}
              onClick={() =>
                runOperation("requestExit", () =>
                  engine.staking.requestExit(user as Address, numericAmount)
                )
              }
            />
            <ActionButton
              label="Execute Exit"
              isLoading={busyOp === "executeExitFromQueue"}
              disabled={busyOp !== null || !wallet.isConnected || !selectedQueueItem}
              onClick={() =>
                selectedQueueItem
                  ? runOperation("executeExitFromQueue", () =>
                      engine.staking.executeExitFromQueue(user as Address, selectedQueueItem.id)
                    )
                  : undefined
              }
            />
            <ActionButton
              label="Cancel Exit"
              isLoading={busyOp === "cancelExitRequest"}
              disabled={busyOp !== null || !wallet.isConnected || !selectedQueueItem}
              onClick={() =>
                selectedQueueItem
                  ? runOperation("cancelExitRequest", () =>
                      engine.staking.cancelExitRequest(user as Address, selectedQueueItem.id)
                    )
                  : undefined
              }
            />
          </div>
          <Typography muted>
            Queue items ready: {stakingState.exitQueue.filter((item) => item.canExit).length}
          </Typography>
        </Card>
      </Section>

      <Section title="Transaction Lifecycle">
        <Card>
          {recentTxs.length === 0 ? (
            <Typography muted>No transactions yet.</Typography>
          ) : (
            <div className={styles.txList}>
              {recentTxs.map((tx) => (
                <div key={tx.id} className={styles.txRow}>
                  <Typography className={styles.txId}>{tx.id}</Typography>
                  <TxStatus status={tx.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
