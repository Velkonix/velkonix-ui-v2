import { useMemo, useState } from "react";

import { useStakingController } from "../features/staking";
import {
  ActionButton,
  AmountInput,
  Card,
  Divider,
  EmptyState,
  Icon,
  MetricTile,
  PageContainer,
  PageHeader,
  PanelHeader,
  PanelHeaderStat,
  Section,
  Switch,
  Tabs,
  ToastPopup,
  TxStatus,
  Typography,
  ValueCell,
} from "../shared/ui";
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./StakingPage.module.css";

type StakingTabId = "rewards" | "convert" | "stake" | "unstake" | "exit";

type QueueRow = {
  id: string;
  amount: number;
  startDate: number;
  unlockDate: number;
  canExit: boolean;
  status: "queued" | "ready" | "executed" | "cancelled";
};

const formatAmount = (value: number): string => formatNumber(value);
const formatPercent = (value: number): string =>
  `${formatNumber(value, { decimals: 2, compact: false })}%`;

const formatDateTime = (value: number): string =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isFinalQueueStatus = (status: QueueRow["status"]): boolean =>
  status === "executed" || status === "cancelled";

const getQueueStatusTone = (status: QueueRow["status"]): "pending" | "success" | "failed" => {
  if (status === "cancelled") {
    return "failed";
  }

  if (status === "executed") {
    return "success";
  }

  return "pending";
};

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

  const [activeTab, setActiveTab] = useState<StakingTabId>("rewards");
  const [convertAmount, setConvertAmount] = useState("100");
  const [stakeAmount, setStakeAmount] = useState("50");
  const [unstakeAmount, setUnstakeAmount] = useState("50");
  const [exitAmount, setExitAmount] = useState("40");
  const [isInstantExit, setIsInstantExit] = useState(false);

  const parsedExitAmount = Number(exitAmount);
  const normalizedExitAmount =
    Number.isFinite(parsedExitAmount) && parsedExitAmount > 0 ? parsedExitAmount : 0;
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
        <Section className={styles.actionsColumn}>
          <Card className={styles.actionsCard}>
            <Tabs
              items={[
                { id: "rewards", label: "Rewards" },
                { id: "convert", label: "Convert" },
                { id: "stake", label: "Stake" },
                { id: "unstake", label: "Unstake" },
                { id: "exit", label: "Exit" },
              ]}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as StakingTabId)}
            />

            <div className={styles.tabPanel}>
              {activeTab === "rewards" ? (
                <div className={styles.tabContent}>
                  <div className={styles.rewardsGrid}>
                    <MetricTile
                      title="Staked"
                      value={`${formatAmount(stakingState.staked)} xVELK`}
                      tone="subtle"
                      media={
                        <Icon size={18} viewBox="0 0 24 24" aria-label="Staked amount icon">
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
                          <line
                            x1="18.68"
                            y1="3.41"
                            x2="14.86"
                            y2="5.32"
                            stroke="currentColor"
                            strokeWidth="1.91"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                          />
                          <line
                            x1="19.64"
                            y1="6.27"
                            x2="13.91"
                            y2="6.27"
                            stroke="currentColor"
                            strokeWidth="1.91"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                          />
                          <line
                            x1="12"
                            y1="11.05"
                            x2="12"
                            y2="12"
                            stroke="currentColor"
                            strokeWidth="1.91"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                          />
                          <line
                            x1="12"
                            y1="17.73"
                            x2="12"
                            y2="18.68"
                            stroke="currentColor"
                            strokeWidth="1.91"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                          />
                        </Icon>
                      }
                    />
                    <MetricTile
                      title="APR"
                      value={formatPercent(stakingState.apr)}
                      tone="subtle"
                      media={
                        <Icon size={18} viewBox="0 0 24 24" aria-label="APR icon">
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
                      title="Unclaimed"
                      value={`${formatAmount(stakingState.rewards)} xVELK`}
                      tone="subtle"
                      media={
                        <Icon size={18} viewBox="0 0 512 512" aria-label="Unclaimed rewards icon">
                          <rect
                            x="208.372"
                            y="95.256"
                            width="95.256"
                            height="35.721"
                            fill="currentColor"
                          />
                          <path
                            d="M410.791,23.815H101.209C45.402,23.815,0,69.217,0,125.024s45.402,101.209,101.209,101.209h32.692c2.78,8.16,5.757,15.983,8.939,23.408c12.477,29.114,27.794,52.039,45.525,68.14c7.236,6.57,14.818,11.956,22.709,16.183c-9.165,14.095-11.029,31.584-5.584,47.059h-38.792v107.163h178.605V381.023h-38.793c5.445-15.474,3.582-32.964-5.583-47.059c7.891-4.227,15.473-9.613,22.709-16.183c17.732-16.101,33.049-39.026,45.525-68.14c3.182-7.424,6.158-15.248,8.939-23.408h32.692c55.807,0,101.209-45.402,101.209-101.209S466.597,23.815,410.791,23.815z M101.209,190.512c-36.11,0-65.488-29.378-65.488-65.488s29.378-65.488,65.488-65.488h6.173c1.118,47.317,6.676,91.933,16.182,130.977H101.209z M309.581,416.745v35.721H202.419v-35.721H309.581z M243.37,350.535c6.964-6.966,18.295-6.964,25.258,0c6.964,6.963,6.964,18.294,0,25.258c-6.964,6.964-18.294,6.964-25.258,0C236.406,368.829,236.406,357.499,243.37,350.535z M256,309.582c-63.003,0-109.401-104.1-112.903-250.046h225.807C365.401,205.482,319.003,309.582,256,309.582z M410.791,190.512h-22.353c9.504-39.044,15.062-83.66,16.182-130.977h6.171c36.11,0,65.488,29.378,65.488,65.488S446.901,190.512,410.791,190.512z"
                            fill="currentColor"
                          />
                        </Icon>
                      }
                    />
                  </div>
                  <div className={styles.rewardsActions}>
                    <ActionButton
                      label={busyOp === "claimStakingRewards" ? "Claiming..." : "Claim"}
                      isLoading={busyOp === "claimStakingRewards"}
                      disabled={!wallet.isConnected || busyOp !== null || stakingState.rewards <= 0}
                      onClick={() => void claimStakingRewards()}
                    />
                  </div>
                </div>
              ) : null}

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
                      isLoading={
                        isInstantExit ? busyOp === "instantExit" : busyOp === "requestExit"
                      }
                      disabled={!wallet.isConnected || busyOp !== null}
                      onClick={() =>
                        void (isInstantExit ? instantExit(exitAmount) : requestExit(exitAmount))
                      }
                    />
                    <Switch
                      label="Instant"
                      checked={isInstantExit}
                      onChange={(event) => setIsInstantExit(event.target.checked)}
                    />
                  </div>

                  <Divider />

                  <div className={styles.exitQueueBlock}>
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
                      <EmptyState
                        title="No exit requests"
                        description="Create queue request in Exit tab to see it here."
                      />
                    ) : (
                      <ul className={styles.queueCards}>
                        {queueRows.map((row) => {
                          const showExecuteAction = row.canExit && !isFinalQueueStatus(row.status);
                          const showCancelAction = !showExecuteAction && row.status === "queued";

                          return (
                            <li key={row.id} className={styles.queueCard}>
                              <div className={styles.queueCardHeader}>
                                <div className={styles.queueCardAmount}>
                                  <Typography as="span" variant="microcaption" muted>
                                    Amount
                                  </Typography>
                                  <ValueCell>{formatAmount(row.amount)}</ValueCell>
                                </div>
                                <TxStatus status={getQueueStatusTone(row.status)} />
                              </div>

                              <div className={styles.queueMetaGrid}>
                                <div className={styles.queueMetaItem}>
                                  <Typography as="span" variant="microcaption" muted>
                                    Start
                                  </Typography>
                                  <ValueCell tone="muted">
                                    {formatDateTime(row.startDate)}
                                  </ValueCell>
                                </div>
                                <div className={styles.queueMetaItem}>
                                  <Typography as="span" variant="microcaption" muted>
                                    Unlock
                                  </Typography>
                                  <ValueCell tone="muted">
                                    {formatDateTime(row.unlockDate)}
                                  </ValueCell>
                                </div>
                              </div>

                              {showExecuteAction ? (
                                <div className={styles.queueCardAction}>
                                  <ActionButton
                                    label="Execute Exit"
                                    disabled={!wallet.isConnected || busyOp !== null}
                                    onClick={() => void executeExitFromQueue(row.id)}
                                  />
                                </div>
                              ) : null}

                              {showCancelAction ? (
                                <div className={styles.queueCardAction}>
                                  <ActionButton
                                    label="Cancel Exit"
                                    disabled={!wallet.isConnected || busyOp !== null}
                                    onClick={() => void cancelExitRequest(row.id)}
                                  />
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </Section>
      </div>
    </PageContainer>
  );
}
