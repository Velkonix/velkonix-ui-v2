import { useEffect, useMemo, useRef, useState } from "react";

import { useWallet } from "../app/providers/WalletProvider";
import {
  formatDateTimeUtc,
  formatMultiple,
  formatShare,
  formatToken,
  formatTokenPriceUsd,
  formatUsdc,
  getAllocation,
  getAllocationRatio,
  getCountdownLabel,
  getCurrentStage,
  getOversubscription,
  getPoolShare,
  getRefund,
  getStageStatus,
  getUsedFunds,
  isClaimWindowClosed,
  parseUsdcInput,
  STAGE_LABELS,
  STAGE_ORDER,
  usdcToInputValue,
  useSaleActions,
  useSaleData,
} from "../features/token-sale";
import type {
  SaleAction,
  SaleSchedule,
  SaleStageKey,
  SaleStats,
  UserSaleState,
} from "../features/token-sale";
import {
  Badge,
  Button,
  Card,
  classNames,
  EmptyState,
  MetricTile,
  Modal,
  PageContainer,
  PageHeader,
  Typography,
} from "../shared/ui";
import styles from "./TokenSalePage.module.css";

const SALE_TOKEN = "VELK";
const NETWORK_LABEL = "Arbitrum Sepolia";
const STAKE_ROUTE = "/staking";

const numberFormatter = new Intl.NumberFormat("en-US");

const STEPS: { title: string; text: string }[] = [
  {
    title: "Connect Wallet",
    text: `Connect a wallet on ${NETWORK_LABEL} to access the sale and view your participation dashboard.`,
  },
  {
    title: "Approve USDC",
    text: "Approve the sale contract to spend the amount of USDC you wish to deposit.",
  },
  {
    title: "Deposit",
    text: "Deposit any amount of USDC during the contribution period. Multiple deposits are supported and automatically combined.",
  },
  {
    title: "Wait for Sale End",
    text: "Funds stay locked in the sale contract. Allocations and refunds are finalized after the contribution window closes.",
  },
  {
    title: `Claim ${SALE_TOKEN}`,
    text: "Once claiming opens, claim your full allocation — 100% unlocked, with no vesting.",
  },
  {
    title: "Claim Refund",
    text: "If the sale was oversubscribed, claim the unused part of your deposit back to the same wallet.",
  },
];

const FAQ: { title: string; text: string }[] = [
  {
    title: "What happens if the sale is oversubscribed?",
    text: `If total deposits exceed the hard cap, every participant receives a pro-rata share of the ${SALE_TOKEN} sale allocation.\n\nUser Allocation = User Deposit / Total Deposits × Sale Allocation\n\nOnly the funds backing your final allocation are used. The unused portion of your deposit becomes a refund, claimable to the same wallet after finalization.`,
  },
  {
    title: `When can I claim ${SALE_TOKEN}?`,
    text: "Claiming opens after the contribution window closes and allocations are finalized on-chain. Tokens are 100% unlocked at claim, with no vesting.\n\nUntil the sale is finalized, no tokens are distributed and all allocation figures shown are estimates.",
  },
  {
    title: "How are refunds calculated?",
    text: "Refund = User Deposit − User Used Funds\nwhere\nUser Used Funds = User Allocation × Token Price\n\nIf total deposits remain at or below the hard cap, your entire deposit is converted into tokens and no refund is generated.\n\nRefunds are paid in USDC to the same wallet used for the deposit.",
  },
  {
    title: "Can I deposit multiple times?",
    text: "Yes. You can deposit as many times as you like while the contribution window is open.\n\nAll deposits from the same wallet are combined into a single position. There are no individual deposit limits.",
  },
  {
    title: "Can I withdraw before the sale ends?",
    text: "No. Deposits remain locked in the sale contract until the sale ends and allocations are finalized.\n\nIf the sale is oversubscribed, the unused portion of your deposit can be claimed back as a refund.",
  },
  {
    title: `What is x${SALE_TOKEN}?`,
    text: `x${SALE_TOKEN} is the staked version of ${SALE_TOKEN}.\n\nWhen you stake ${SALE_TOKEN}, you receive x${SALE_TOKEN}, which represents your share of the staking pool and accrues protocol revenue over time.`,
  },
];

const DISCLAIMER = `Participation in the ${SALE_TOKEN} Public Token Sale involves risk. As with any digital asset, the value of ${SALE_TOKEN} may fluctuate over time. Please ensure you understand the sale mechanics and only participate using funds you are comfortable committing.

Deposits are held in an immutable smart contract until the sale is finalized. While the contract parameters cannot be changed after the sale begins, smart contracts may contain bugs or vulnerabilities, and interacting with them carries inherent technical risks.

${SALE_TOKEN} does not represent equity, debt, or any claim to the assets, revenue, or profits of any entity. Nothing on this page constitutes financial, legal, or tax advice. Participation may be restricted in certain jurisdictions. It is your responsibility to ensure that participating is lawful where you reside.

By depositing USDC, you acknowledge that you have read and understood the sale mechanics, including the pro-rata allocation and refund process, and that you participate entirely at your own risk.`;

type StageTone = "success" | "warning" | "neutral";

const stageTone = (stage: SaleStageKey | null): StageTone => {
  if (stage === "contribution" || stage === "claim") return "success";
  if (stage === "upcoming") return "warning";
  return "neutral";
};

function getStageMeta(stage: SaleStageKey, schedule: SaleSchedule): string {
  switch (stage) {
    case "upcoming":
      return `Starts ${formatDateTimeUtc(schedule.saleStartMs)}`;
    case "contribution":
      return `Ends ${formatDateTimeUtc(schedule.saleEndMs)}`;
    case "closed":
      return `From ${formatDateTimeUtc(schedule.saleEndMs)}`;
    case "finalized":
      return schedule.finalized ? "Completed" : "After sale close";
    case "claim":
      return schedule.claimDeadlineMs > 0
        ? `Closes ${formatDateTimeUtc(schedule.claimDeadlineMs)}`
        : "Open after finalization";
  }
}

function getStageCountdownTarget(stage: SaleStageKey, schedule: SaleSchedule): number | null {
  switch (stage) {
    case "upcoming":
      return schedule.saleStartMs;
    case "contribution":
      return schedule.saleEndMs;
    case "claim":
      return schedule.claimDeadlineMs || null;
    default:
      return null;
  }
}

function getClaimStatusLabel(
  stage: SaleStageKey | null,
  user: UserSaleState,
  hasRefund: boolean,
  claimsClosed: boolean
): string {
  if (user.deposit === 0n) return "Not participating";
  if (stage === "upcoming" || stage === "contribution") return "Sale in progress";
  if (stage === "closed") return "Awaiting finalization";
  if (stage === "finalized") return "Claim opens soon";
  if (user.tokensClaimed && (!hasRefund || user.refundClaimed)) return "Claimed";
  if (claimsClosed) return "Claim window closed";
  return "Claim open";
}

function StagesTimeline({ schedule, nowMs }: { schedule: SaleSchedule; nowMs: number | null }) {
  const current = nowMs == null ? null : getCurrentStage(schedule, nowMs);

  return (
    <Card
      title="Sale Status"
      subtitle="All times are shown in UTC. Stages advance automatically."
      actions={
        current ? <Badge tone={stageTone(current)}>{STAGE_LABELS[current]}</Badge> : undefined
      }
    >
      <ol className={styles.stages}>
        {STAGE_ORDER.map((stage, index) => {
          const status = current ? getStageStatus(stage, current) : "pending";
          const target = getStageCountdownTarget(stage, schedule);
          const showCountdown =
            status === "active" && nowMs != null && target != null && target > 0;
          return (
            <li key={stage} className={styles.stageStep} data-status={status}>
              <div className={styles.stageMarker}>
                <span className={styles.stageDot} data-status={status}>
                  {status === "completed" ? "✓" : index + 1}
                </span>
                {index < STAGE_ORDER.length - 1 ? (
                  <span className={styles.stageConnector} data-completed={status === "completed"} />
                ) : null}
              </div>
              <div className={styles.stageBody}>
                <span className={styles.stageName} data-status={status}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className={styles.stageMeta}>{getStageMeta(stage, schedule)}</span>
                {showCountdown ? (
                  <span className={styles.stageCountdown}>{getCountdownLabel(target, nowMs)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  user: UserSaleState;
  stats: SaleStats;
  pendingAction: SaleAction | null;
  onApprove: (amount: bigint) => Promise<unknown>;
  onDeposit: (amount: bigint) => Promise<unknown>;
  onDeposited: () => void;
};

function DepositModal({
  open,
  onClose,
  user,
  stats,
  pendingAction,
  onApprove,
  onDeposit,
  onDeposited,
}: DepositModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amount = useMemo(() => parseUsdcInput(input) ?? 0n, [input]);
  const estimatedTotal = stats.totalDeposited + amount;
  const estimatedAllocation = getAllocation(
    amount,
    estimatedTotal,
    stats.hardCap,
    stats.saleAllocation
  );
  const estimatedUsedFunds = getUsedFunds(estimatedAllocation, stats.hardCap, stats.saleAllocation);
  const estimatedRefund = getRefund(amount, estimatedTotal, stats.hardCap, stats.saleAllocation);

  const needsApproval = amount > 0n && user.usdcAllowance < amount;
  const exceedsBalance = amount > user.usdcBalance;
  const isApproving = pendingAction === "approve";
  const isDepositing = pendingAction === "deposit";
  const busy = isApproving || isDepositing;
  const depositDisabled = amount <= 0n || needsApproval || exceedsBalance || busy;

  const handleClose = () => {
    if (busy) return;
    setInput("");
    setError(null);
    onClose();
  };

  const handleInputChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInput(value);
      setError(null);
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      await onApprove(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeposit = async () => {
    setError(null);
    try {
      await onDeposit(amount);
      onDeposited();
      setInput("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Deposit USDC" size="sm">
      <Typography as="p" variant="body" muted className={styles.modalNote}>
        Deposits are locked until the sale ends. If the sale is oversubscribed, your allocation is
        reduced pro-rata and the unused portion is refunded to this wallet.
      </Typography>

      <div className={styles.amountRow}>
        <input
          className={styles.amountInput}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className={styles.maxButton}
          onClick={() => {
            setInput(usdcToInputValue(user.usdcBalance));
            setError(null);
          }}
          disabled={busy}
        >
          MAX
        </button>
        <span className={styles.amountSymbol}>USDC</span>
      </div>
      <div className={styles.balanceRow}>
        <span>Wallet Balance</span>
        <span>{`${formatUsdc(user.usdcBalance)} USDC`}</span>
      </div>

      {amount > 0n ? (
        <div className={styles.estimateList}>
          <div className={styles.estimateRow}>
            <span>Estimated Allocation</span>
            <span
              className={styles.estimateValue}
            >{`${formatToken(estimatedAllocation)} ${SALE_TOKEN}`}</span>
          </div>
          <div className={styles.estimateRow}>
            <span>Estimated Used Funds</span>
            <span className={styles.estimateValue}>{formatUsdc(estimatedUsedFunds)}</span>
          </div>
          <div className={styles.estimateRow}>
            <span>Estimated Refund</span>
            <span className={styles.estimateValue}>{formatUsdc(estimatedRefund)}</span>
          </div>
          <Typography as="p" variant="caption" muted>
            Final values are calculated after the sale closes and depend on total deposits.
          </Typography>
        </div>
      ) : null}

      {exceedsBalance ? (
        <div className={styles.warningBanner}>Amount exceeds your wallet balance.</div>
      ) : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.modalActions}>
        <Button
          variant="secondary"
          onClick={handleApprove}
          disabled={amount <= 0n || !needsApproval || exceedsBalance || busy}
          isLoading={isApproving}
        >
          {isApproving
            ? "Approving…"
            : needsApproval || amount === 0n
              ? "Approve USDC"
              : "Approved"}
        </Button>
        <Button
          variant="primary"
          onClick={handleDeposit}
          disabled={depositDisabled}
          isLoading={isDepositing}
        >
          {isDepositing ? "Depositing…" : "Deposit"}
        </Button>
      </div>
    </Modal>
  );
}

export function TokenSalePage() {
  const wallet = useWallet();
  const connected = wallet.isConnected;

  const { isSaleConfigured, schedule, stats, user, refetchAll } = useSaleData();
  const { approve, deposit, claimTokens, claimRefund, pendingAction } = useSaleActions(refetchAll);

  const [nowMs, setNowMs] = useState<number | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const stage: SaleStageKey | null = nowMs == null ? null : getCurrentStage(schedule, nowMs);
  const claimsClosed = nowMs != null && isClaimWindowClosed(schedule, nowMs);

  const tokenPrice = formatTokenPriceUsd(stats.hardCap, stats.saleAllocation);
  const hardCapText = formatUsdc(stats.hardCap, 0);
  const allocationText = `${formatToken(stats.saleAllocation, 0)} ${SALE_TOKEN}`;

  const oversubscription = getOversubscription(stats.totalDeposited, stats.hardCap);
  const allocationRatio = getAllocationRatio(stats.totalDeposited, stats.hardCap);
  const progressPercent = Math.min(100, oversubscription * 100);
  const averageDeposit =
    stats.participantCount > 0 ? stats.totalDeposited / BigInt(stats.participantCount) : 0n;

  const allocation =
    user.finalAllocation ??
    getAllocation(user.deposit, stats.totalDeposited, stats.hardCap, stats.saleAllocation);
  const refund =
    user.finalRefund ??
    getRefund(user.deposit, stats.totalDeposited, stats.hardCap, stats.saleAllocation);
  const poolShare = getPoolShare(user.deposit, stats.totalDeposited);
  const isFinal = user.finalAllocation != null;
  const hasRefund = refund > 0n;
  const fullyClaimed = user.tokensClaimed && (!hasRefund || user.refundClaimed);
  const claimOpen = stage === "claim";

  const scrollTo = (ref: typeof dashboardRef) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleClaim = async (action: () => Promise<unknown>) => {
    setClaimError(null);
    try {
      await action();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : String(err));
    }
  };

  const renderHeroCta = () => {
    if (!connected) {
      return (
        <Button variant="primary" onClick={() => void wallet.connect()}>
          Connect Wallet
        </Button>
      );
    }
    switch (stage) {
      case "contribution":
        return (
          <Button
            variant="primary"
            onClick={() => setDepositOpen(true)}
            disabled={!isSaleConfigured}
          >
            Deposit USDC
          </Button>
        );
      case "claim":
        return (
          <Button variant="primary" onClick={() => scrollTo(dashboardRef)}>
            Claim {SALE_TOKEN}
          </Button>
        );
      case "upcoming":
        return (
          <Button variant="primary" disabled>
            Sale Not Started
          </Button>
        );
      case "closed":
      case "finalized":
        return (
          <Button variant="primary" onClick={() => scrollTo(dashboardRef)}>
            View Your Position
          </Button>
        );
      default:
        return (
          <Button variant="primary" disabled>
            Deposit USDC
          </Button>
        );
    }
  };

  return (
    <PageContainer className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.eyebrow}>
            <span className={styles.statusDot} data-tone={stageTone(stage)} aria-hidden="true" />
            <Badge tone={stageTone(stage)}>{stage ? STAGE_LABELS[stage] : "Token Sale"}</Badge>
          </div>
          <PageHeader
            title={`${SALE_TOKEN} Public Token Sale`}
            subtitle={`${SALE_TOKEN} is the utility and governance token of the Velkonix lending protocol. The public sale offers ${allocationText} at a fixed price of ${tokenPrice} per token, with a total raise target of ${hardCapText}. No deposit limits, no KYC — contribute in USDC throughout the subscription period. Oversubscription is handled pro-rata with automatic refunds, and 100% of purchased ${SALE_TOKEN} unlocks at claim.`}
          />
          <div className={styles.heroActions}>
            {renderHeroCta()}
            <Button variant="ghost" onClick={() => scrollTo(faqRef)}>
              View FAQ
            </Button>
          </div>
        </div>

        <div className={styles.heroSide}>
          <MetricTile title="Token Price" value={tokenPrice} tone="subtle" />
          <MetricTile title="Sale Allocation" value={allocationText} tone="subtle" />
          <MetricTile title="Hard Cap" value={hardCapText} tone="subtle" />
        </div>
      </section>

      {!isSaleConfigured ? (
        <div className={styles.notice}>
          The sale contract is not configured on this network yet. Live statistics and deposits will
          be enabled once the contract address is set.
        </div>
      ) : null}

      <StagesTimeline schedule={schedule} nowMs={nowMs} />

      <Card
        title="Sale Terms"
        subtitle="Parameters are fixed and cannot change after the sale starts."
      >
        <div className={styles.metricGrid}>
          <MetricTile title="Token Price" value={tokenPrice} />
          <MetricTile title="Sale Allocation" value={allocationText} />
          <MetricTile title="Hard Cap" value={hardCapText} />
          <MetricTile title="Network" value={NETWORK_LABEL} />
          <MetricTile title="Allocation Model" value="Pro-rata" />
          <MetricTile title="Limits" value="None" />
        </div>
      </Card>

      <Card
        title="Sale Statistics"
        subtitle="Live totals across all participants. Updated every 30 seconds."
      >
        <div className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={styles.progressLegend}>
          <span>{`${(oversubscription * 100).toFixed(0)}% of ${hardCapText} target`}</span>
          <span>{`${formatUsdc(stats.totalDeposited)} committed`}</span>
        </div>
        <div className={classNames(styles.metricGrid, styles.metricGridTop)}>
          <MetricTile title="Total Deposited" value={formatUsdc(stats.totalDeposited)} />
          <MetricTile title="Raise Target" value={hardCapText} />
          <MetricTile title="Oversubscription" value={formatMultiple(oversubscription)} />
          <MetricTile title="Participants" value={numberFormatter.format(stats.participantCount)} />
          <MetricTile title="Average Deposit" value={formatUsdc(averageDeposit)} />
          <MetricTile title="Allocation Ratio" value={formatShare(allocationRatio)} />
          {stats.totalTokensSold > 0n ? (
            <MetricTile
              title="Tokens Sold"
              value={`${formatToken(stats.totalTokensSold, 0)} ${SALE_TOKEN}`}
            />
          ) : null}
        </div>
      </Card>

      <div ref={dashboardRef}>
        <Card
          title="Your Participation"
          subtitle={
            connected
              ? "Your deposit, allocation and claim status for this sale."
              : "Connect wallet to view your deposit, allocation and claim status."
          }
          actions={
            connected ? (
              <Badge tone="neutral">
                {getClaimStatusLabel(stage, user, hasRefund, claimsClosed)}
              </Badge>
            ) : (
              <Badge tone="warning">Wallet not connected</Badge>
            )
          }
        >
          {!connected ? (
            <EmptyState
              title="Connect wallet"
              description="Sale statistics are public. Connect your wallet to see your personal participation details and available actions."
            />
          ) : user.deposit === 0n && stage !== "contribution" ? (
            <EmptyState
              title="No deposit yet"
              description={
                stage === "upcoming"
                  ? "The contribution window has not opened yet. Come back once the sale starts."
                  : "This wallet did not participate in the sale."
              }
            />
          ) : (
            <>
              <div className={styles.metricGrid}>
                <MetricTile title="Your Deposit" value={formatUsdc(user.deposit)} />
                <MetricTile title="Your Share Of Pool" value={formatShare(poolShare)} />
                <MetricTile
                  title={isFinal ? "Final Allocation" : "Estimated Allocation"}
                  value={`${formatToken(allocation)} ${SALE_TOKEN}`}
                />
                <MetricTile
                  title={isFinal ? "Final Refund" : "Estimated Refund"}
                  value={formatUsdc(refund)}
                />
                <MetricTile
                  title="Claimable"
                  value={`${formatToken(user.claimableTokens)} ${SALE_TOKEN}`}
                />
                <MetricTile title="Claimable Refund" value={formatUsdc(user.claimableRefund)} />
              </div>

              <div className={styles.dashboardActions}>
                {stage === "contribution" ? (
                  <Button variant="primary" onClick={() => setDepositOpen(true)}>
                    Deposit USDC
                  </Button>
                ) : null}
                {claimOpen && !claimsClosed ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleClaim(claimTokens)}
                      disabled={user.claimableTokens === 0n || pendingAction === "claimTokens"}
                      isLoading={pendingAction === "claimTokens"}
                    >
                      {user.tokensClaimed ? `${SALE_TOKEN} Claimed` : `Claim ${SALE_TOKEN}`}
                    </Button>
                    {hasRefund ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleClaim(claimRefund)}
                        disabled={user.claimableRefund === 0n || pendingAction === "claimRefund"}
                        isLoading={pendingAction === "claimRefund"}
                      >
                        {user.refundClaimed ? "Refund Claimed" : "Claim Refund"}
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {claimOpen && claimsClosed && !fullyClaimed ? (
                <div className={styles.warningBanner}>
                  The claim window has closed. Unclaimed allocations and refunds can no longer be
                  claimed.
                </div>
              ) : null}
              {fullyClaimed ? (
                <div className={styles.successBanner}>
                  <span>Stake your {SALE_TOKEN} and start earning protocol revenue.</span>
                  <Button variant="primary" onClick={() => window.location.assign(STAKE_ROUTE)}>
                    Stake {SALE_TOKEN}
                  </Button>
                </div>
              ) : null}
              {claimError ? <div className={styles.errorBanner}>{claimError}</div> : null}
            </>
          )}
        </Card>
      </div>

      <Card
        title="How It Works"
        subtitle="No tokens are distributed before the sale ends — figures are finalized after the contribution window closes."
      >
        <div className={styles.steps}>
          {STEPS.map((step, index) => (
            <div key={step.title} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepText}>{step.text}</span>
            </div>
          ))}
        </div>
        <pre className={styles.formula}>
          {`User Allocation = User Deposit / Total Deposits × ${allocationText}
User Used Funds = User Allocation × ${tokenPrice}
Refund          = User Deposit − User Used Funds

If Total Deposits ≤ ${hardCapText} the full deposit converts into ${SALE_TOKEN} and the refund is zero.`}
        </pre>
      </Card>

      <div ref={faqRef}>
        <Card title="FAQ" subtitle="How the sale, allocations, and refunds work.">
          <div className={styles.faq}>
            {FAQ.map((item, index) => (
              <details key={item.title} className={styles.faqItem} open={index === 0}>
                <summary className={styles.faqSummary}>{item.title}</summary>
                <p className={styles.faqText}>{item.text}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Risk Disclaimer" subtitle="Please read carefully before participating.">
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
      </Card>

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        user={user}
        stats={stats}
        pendingAction={pendingAction}
        onApprove={approve}
        onDeposit={deposit}
        onDeposited={() => showToast("Deposit successful")}
      />

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </PageContainer>
  );
}
