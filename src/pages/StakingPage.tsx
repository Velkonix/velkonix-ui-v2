import { useMemo, useState } from "react";

import { useStakingController } from "../features/staking";
import {
  ActionButton,
  AmountInput,
  Card,
  ClaimButton,
  EmptyState,
  Icon,
  MetricTile,
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
} from "../shared/ui";
import { formatNumber } from "../shared/lib/numberFormat";
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

const formatAmount = (value: number): string => formatNumber(value);
const formatPercent = (value: number): string => `${formatNumber(value, { decimals: 2, compact: false })}%`;

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
            <div className={styles.metricsColumn}>
              <MetricTile
                title="Total staked"
                value={`${formatAmount(stakingState.staked)} xVELK`}
                tone="subtle"
                media={
                  <Icon size={18} aria-label="Total staked icon">
                    <path
                      d="M3.8 15h12.4M5.8 12.1V9.2M9.9 12.1V6.7M14 12.1V4.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
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
                title="Pending rebase"
                value={`${formatAmount(stakingState.pendingRebase)} xVELK`}
                tone="subtle"
                media={
                  <Icon size={18} viewBox="0 0 298.807 298.807" aria-label="Pending rebase icon">
                    <path
                      d="M223.383,255.164l-9.54-33.76c-71.4,63.126-130.786,5.012-141.612-11.675l5.504-3.399c2.433-1.508,3.857-4.221,3.707-7.081 c-0.149-2.857-1.846-5.41-4.423-6.654l-49.377-23.802c-1.08-0.523-2.239-0.782-3.399-0.782c-1.433,0-2.861,0.398-4.121,1.175 c-2.279,1.403-3.682,3.871-3.722,6.548l-0.841,54.812c-0.045,2.861,1.478,5.519,3.965,6.937c1.205,0.682,2.539,1.02,3.872,1.02 c1.429,0,2.857-0.389,4.121-1.169l2.633-1.627c45.271,73.442,149.175,80.638,205.414,32.69 C229.663,266.098,225.12,261.325,223.383,255.164z"
                      fill="currentColor"
                    />
                    <path
                      d="M56.666,169.026c-5.809-31.47,15.082-95.47,84.416-103.008v0.836c0,2.861,1.563,5.499,4.071,6.873 c1.174,0.647,2.474,0.965,3.767,0.965c1.469,0,2.936-0.413,4.221-1.234l46.196-29.5c2.26-1.443,3.623-3.931,3.623-6.608 c0-2.678-1.363-5.166-3.618-6.609L153.14,1.234C151.856,0.413,150.388,0,148.919,0c-1.293,0-2.593,0.318-3.767,0.965 c-2.508,1.374-4.071,4.011-4.071,6.873v8.639C73.737,16.189,2.111,79.857,6.727,165.732c0,0,10.425-10.112,17.517-10.112 C30.207,155.62,31.274,156.788,56.666,169.026z"
                      fill="currentColor"
                    />
                    <path
                      d="M292.123,212.351c-0.592-2.802-2.662-5.061-5.405-5.887l-5.652-1.707c16.622-46.53,11.226-126.807-66.247-171.649 c0.293,1.383,0.532,2.787,0.532,4.24c0,6.942-3.494,13.317-9.346,17.054l-26.679,17.035c23.634,6.821,77.648,48.932,54.274,118.997 l-3.384-1.02c-0.746-0.223-1.508-0.338-2.265-0.338c-2.025,0-4.006,0.792-5.488,2.249c-2.045,2.005-2.832,4.966-2.056,7.723 l14.899,52.746c0.727,2.574,2.717,4.599,5.275,5.375c0.741,0.223,1.507,0.333,2.265,0.333c1.846,0,3.662-0.658,5.105-1.892 l41.604-35.691C291.73,218.055,292.715,215.153,292.123,212.351z"
                      fill="currentColor"
                    />
                  </Icon>
                }
              />
              <MetricTile
                title="Unclaimed rewards"
                value={`${formatAmount(stakingState.rewards)} xVELK`}
                tone="subtle"
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
                    size="sm"
                    isLoading={busyOp === "claimStakingRewards"}
                    disabled={!wallet.isConnected || busyOp !== null || stakingState.rewards <= 0}
                    onClick={() => void claimStakingRewards()}
                  />
                }
              />
            </div>
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
