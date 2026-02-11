import { useMemo, useState } from "react";

import { useStakingController } from "../features/staking";
import {
  ActionButton,
  AmountInput,
  Card,
  ClaimButton,
  EmptyState,
  PageContainer,
  PageHeader,
  PanelHeader,
  PanelHeaderStat,
  Section,
  Switch,
  Table,
  Tabs,
  ToastPopup,
  TxStatus,
  Typography,
  ValueCell,
  WalletBalanceCard,
} from "../shared/ui";
import styles from "./StakingPage.module.css";

type StakingTabId = "convert" | "stake" | "unstake" | "exit";

type QueueRow = {
  id: string;
  amount: number;
  startDate: number;
  unlockDate: number;
  canExit: boolean;
  status: "queued" | "ready" | "executed" | "cancelled";
};

const formatAmount = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value: number): string =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function StakingPage() {
  const {
    wallet,
    busyOp,
    lastError,
    toast,
    stakingState,
    queueEntries,
    convert,
    stakeToRewards,
    unstakeFromRewards,
    claimStakingRewards,
    instantExit,
    requestExit,
    executeExitFromQueue,
    cancelExitRequest,
    clearToast,
  } = useStakingController();

  const [activeTab, setActiveTab] = useState<StakingTabId>("convert");
  const [convertAmount, setConvertAmount] = useState("100");
  const [stakeAmount, setStakeAmount] = useState("50");
  const [unstakeAmount, setUnstakeAmount] = useState("50");
  const [exitAmount, setExitAmount] = useState("40");
  const [isInstantExit, setIsInstantExit] = useState(false);

  const parsedExitAmount = Number(exitAmount);
  const normalizedExitAmount = Number.isFinite(parsedExitAmount) && parsedExitAmount > 0 ? parsedExitAmount : 0;
  const instantExitLoss = (normalizedExitAmount * stakingState.instantExitPenaltyBps) / 10_000;

  const queueRows = useMemo<QueueRow[]>(
    () =>
      queueEntries.map((item) => ({
        id: item.id,
        amount: item.amount,
        startDate: item.startDate,
        unlockDate: item.unlockDate,
        canExit: item.canExit,
        status: item.status,
      })),
    [queueEntries]
  );

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Staking"
        subtitle="stake velk. earn from penalties and treasury flows"
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

      <div className={styles.mainRow}>
        <div className={`${styles.mainColumn} ${styles.leftColumn}`}>
          <Section>
            <Card>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <Typography as="span" variant="caption" muted>
                    Total staked
                  </Typography>
                  <Typography as="p" variant="body" className={styles.summaryValue}>
                    {formatAmount(stakingState.staked)}
                  </Typography>
                </div>
                <div className={styles.summaryItem}>
                  <Typography as="span" variant="caption" muted>
                    APR
                  </Typography>
                  <Typography as="p" variant="body" className={styles.summaryValue}>
                    {stakingState.apr.toFixed(2)}%
                  </Typography>
                </div>
              </div>
            </Card>
          </Section>
          <Section>
            <Card className={styles.claimCard}>
              <PanelHeader title="Claim rewards" />
              <WalletBalanceCard
                label="Unclaimed rewards"
                value={`${formatAmount(stakingState.rewards)} xVELK`}
                icon="reward"
              />
              <ClaimButton
                isLoading={busyOp === "claimStakingRewards"}
                disabled={!wallet.isConnected || busyOp !== null || stakingState.rewards <= 0}
                onClick={() => void claimStakingRewards()}
              />
            </Card>
          </Section>
        </div>

        <Section className={`${styles.mainColumn} ${styles.actionsColumn}`}>
          <Card className={styles.actionsCard}>
            <Tabs
              items={[
                { id: "convert", label: "Convert" },
                { id: "stake", label: "Stake" },
                { id: "unstake", label: "Unstake" },
                { id: "exit", label: "Exit" },
              ]}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as StakingTabId)}
            />

            <div className={styles.tabPanel}>
              {activeTab === "convert" ? (
                <div className={styles.tabContent}>
                  <AmountInput
                    label="Convert amount"
                    value={convertAmount}
                    onChange={(event) => setConvertAmount(event.target.value)}
                    placeholder="0.00"
                    assetLabel="VELK"
                  />
                  <Typography variant="microcaption" muted>
                    Convert VELK into xVELK staked position.
                  </Typography>
                  <ActionButton
                    label={busyOp === "convert" ? "Converting..." : "Convert"}
                    isLoading={busyOp === "convert"}
                    disabled={!wallet.isConnected || busyOp !== null}
                    onClick={() => void convert(convertAmount)}
                  />
                </div>
              ) : null}

              {activeTab === "stake" ? (
                <div className={styles.tabContent}>
                  <AmountInput
                    label="Stake amount"
                    value={stakeAmount}
                    onChange={(event) => setStakeAmount(event.target.value)}
                    placeholder="0.00"
                    assetLabel="xVELK"
                  />
                  <Typography variant="microcaption" muted>
                    Stake xVELK into the rewards pool to start earning.
                  </Typography>
                  <div className={styles.buttonRow}>
                    <ActionButton
                      label={busyOp === "stakeToRewards" ? "Staking..." : "Stake"}
                      isLoading={busyOp === "stakeToRewards"}
                      disabled={!wallet.isConnected || busyOp !== null}
                      onClick={() => void stakeToRewards(stakeAmount)}
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "unstake" ? (
                <div className={styles.tabContent}>
                  <AmountInput
                    label="Unstake amount"
                    value={unstakeAmount}
                    onChange={(event) => setUnstakeAmount(event.target.value)}
                    placeholder="0.00"
                    assetLabel="xVELK"
                  />
                  <Typography variant="microcaption" muted>
                    Move xVELK back from rewards pool.
                  </Typography>
                  <div className={styles.buttonRow}>
                    <ActionButton
                      label={busyOp === "unstakeFromRewards" ? "Unstaking..." : "Unstake"}
                      isLoading={busyOp === "unstakeFromRewards"}
                      disabled={!wallet.isConnected || busyOp !== null}
                      onClick={() => void unstakeFromRewards(unstakeAmount)}
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "exit" ? (
                <div className={styles.tabContent}>
                  <AmountInput
                    label="Exit amount"
                    value={exitAmount}
                    onChange={(event) => setExitAmount(event.target.value)}
                    placeholder="0.00"
                    assetLabel="xVELK"
                  />
                  <Typography variant="microcaption" muted>
                    Queue normal exit or use instant exit with penalty.
                  </Typography>
                  <div className={styles.exitActionRow}>
                    <ActionButton
                      label={
                        isInstantExit
                          ? busyOp === "instantExit"
                            ? "Exiting..."
                            : `Loss ${formatAmount(instantExitLoss)} xVELK and Exit`
                          : busyOp === "requestExit"
                            ? "Requesting..."
                            : "Request Exit"
                      }
                      variant={isInstantExit ? "danger" : "primary"}
                      isLoading={isInstantExit ? busyOp === "instantExit" : busyOp === "requestExit"}
                      disabled={!wallet.isConnected || busyOp !== null}
                      onClick={() => void (isInstantExit ? instantExit(exitAmount) : requestExit(exitAmount))}
                    />
                    <Switch
                      label="Instant"
                      checked={isInstantExit}
                      onChange={(event) => setIsInstantExit(event.target.checked)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </Section>
      </div>

      <Section>
        <Card>
          <PanelHeader
            title="Exit queue"
            details={
              <>
                <PanelHeaderStat
                  label="Ready"
                  value={stakingState.exitQueue.filter((item) => item.canExit).length}
                />
                <PanelHeaderStat label="Total" value={queueRows.length} />
              </>
            }
          />
          {queueRows.length === 0 ? (
            <EmptyState title="No exit requests" description="Create queue request in Exit tab to see it here." />
          ) : (
            <Table
              columns={[
                {
                  key: "amount",
                  title: "Amount",
                  align: "right",
                  render: (row) => <ValueCell>{formatAmount(row.amount)}</ValueCell>,
                },
                {
                  key: "startDate",
                  title: "Start",
                  render: (row) => <ValueCell tone="muted">{formatDateTime(row.startDate)}</ValueCell>,
                },
                {
                  key: "unlockDate",
                  title: "Unlock",
                  render: (row) => <ValueCell tone="muted">{formatDateTime(row.unlockDate)}</ValueCell>,
                },
                {
                  key: "status",
                  title: "Status",
                  render: (row) => <TxStatus status={row.status === "queued" ? "pending" : "success"} />,
                },
                {
                  key: "actions",
                  title: "",
                  align: "right",
                  render: (row) => (
                    <div className={styles.queueActions}>
                      <ActionButton
                        label="Execute Exit"
                        size="sm"
                        disabled={!wallet.isConnected || busyOp !== null || !row.canExit}
                        onClick={() => void executeExitFromQueue(row.id)}
                      />
                      <ActionButton
                        label="Cancel Exit"
                        size="sm"
                        disabled={!wallet.isConnected || busyOp !== null || row.status !== "queued"}
                        onClick={() => void cancelExitRequest(row.id)}
                      />
                    </div>
                  ),
                },
              ]}
              rows={queueRows}
              getRowKey={(row) => row.id}
            />
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
