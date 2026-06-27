import { useEffect, useMemo, useRef, useState } from "react";

import { useWallet } from "../app/providers/WalletProvider";
import { getCampaignConfig } from "../config/networks";
import {
  formatPoints,
  formatShare,
  formatTokens,
  formatUsd,
  getAvailableWeeks,
  getCampaignDatesLabel,
  getCampaignStatus,
  getCountdownLabel,
  getLastUpdatedLabel,
  getUnlockedWeek,
  shortenAddress,
  useLeaderboard,
  useUserClaim,
  useUserWeekStats,
} from "../features/campaign";
import type { CampaignTab, LeaderboardRow } from "../features/campaign";
import {
  ActionButton,
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  ErrorState,
  MetricTile,
  Modal,
  PageContainer,
  PageHeader,
  Table,
  Tabs,
  Typography,
} from "../shared/ui";
import styles from "./CampaignPage.module.css";

const PAGE_SIZE = 10;
const REWARD_TOKEN = "VLKS1";
const MISSIONS_URL = "https://galxe.com/Velkonix";

const TABS: { id: CampaignTab; label: string }[] = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "overview", label: "Overview" },
  { id: "rules", label: "Rules" },
];

const RULES: { title: string; text: string }[] = [
  {
    title: `What is ${REWARD_TOKEN}?`,
    text: `Season 1 rewards are tracked in ${REWARD_TOKEN}. ${REWARD_TOKEN} is an accounting token used for future Velkonix reward conversion.`,
  },
  {
    title: `How to earn ${REWARD_TOKEN}?`,
    text: `${REWARD_TOKEN} rewards are earned through eligible liquidity participation and ecosystem activity during Season 1.\nEligible activity may include:\n\n• Supplying assets\n• Borrowing assets\n• Sustained liquidity participation\n• Ecosystem missions\n• Community engagement\n• Galxe campaigns and contributor activity\n\nOnchain activity rewards and ecosystem/community rewards may be calculated and distributed separately during the campaign period.\nWeekly balances are finalized after each campaign period.`,
  },
  {
    title: "What activities are eligible?",
    text: "Eligible activity includes supported supply and borrow positions, ecosystem participation, community campaigns, and approved contributor activity.",
  },
  {
    title: `How is ${REWARD_TOKEN} calculated?`,
    text: `${REWARD_TOKEN} is calculated using the lowest eligible supply and borrow balances recorded during the selected campaign period, normalized to USD during weekly finalization.`,
  },
  {
    title: "Why minimum balance?",
    text: "Using the lowest recorded eligible balance helps reward sustained liquidity participation and reduces the impact of temporary balance spikes or short-term deposits.",
  },
  {
    title: "How does the weekly leaderboard work?",
    text: "Each weekly update is based on eligible liquidity activity throughout the selected campaign period.\nDaily finalized balances are aggregated into weekly rankings and reward distribution results.\nThe campaign is designed to reward sustained participation and reduce the impact of short-term balance changes.",
  },
  {
    title: "When can users claim rewards?",
    text: `${REWARD_TOKEN} claim availability and future conversion details will be announced after Season 1 finalization.`,
  },
];

function ClaimCard() {
  const { address } = useWallet();
  const {
    isClaimAvailable,
    claim,
    claimable,
    cumulativeAmount,
    alreadyClaimed,
    claimWeek,
    isPending,
    error,
  } = useUserClaim();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isClaimAvailable || !address || cumulativeAmount === 0n) return null;

  const handleClaim = async () => {
    setLocalError(null);
    try {
      await claim();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const disabled = claimable === 0n || isPending;
  const message = localError ?? error;

  return (
    <Card
      className={styles.claimCard}
      title={`Claim ${REWARD_TOKEN}`}
      subtitle="Available cumulative balance via merkle proof."
    >
      <div className={styles.metricGrid}>
        <MetricTile
          title="Total earned (cumulative)"
          value={`${formatTokens(cumulativeAmount)} ${REWARD_TOKEN}`}
        />
        <MetricTile
          title="Already claimed"
          value={`${formatTokens(alreadyClaimed)} ${REWARD_TOKEN}`}
        />
        <MetricTile
          title={claimWeek != null ? `Claimable now (Week ${claimWeek})` : "Claimable now"}
          value={`${formatTokens(claimable)} ${REWARD_TOKEN}`}
        />
      </div>
      <ActionButton
        className={styles.claimButton}
        label={isPending ? "Claiming…" : claimable === 0n ? "Nothing to claim" : "Claim"}
        onClick={handleClaim}
        disabled={disabled}
        isLoading={isPending}
      />
      {message ? <div className={styles.errorBanner}>{String(message)}</div> : null}
    </Card>
  );
}

export function CampaignPage() {
  const wallet = useWallet();
  const address = wallet.address ?? undefined;
  const connected = wallet.isConnected;
  const campaign = getCampaignConfig();

  const [status, setStatus] = useState(() => getCampaignStatus(campaign));
  const [week, setWeek] = useState<number>(() => getUnlockedWeek(campaign));
  const [availableWeeks, setAvailableWeeks] = useState<number[]>(() => getAvailableWeeks(campaign));
  const [activeTab, setActiveTab] = useState<CampaignTab>("leaderboard");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [countdownLabel, setCountdownLabel] = useState(() =>
    getCountdownLabel(campaign, getUnlockedWeek(campaign))
  );
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<number | null>(null);

  const leaderboard = useLeaderboard(week);
  const rows = leaderboard.data?.rows ?? [];
  const leaderboardEmpty = !leaderboard.isLoading && rows.length === 0;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const lastUpdatedLabel = getLastUpdatedLabel(leaderboard.data?.finalizedAt);

  const userStats = useUserWeekStats(week, address);

  const currentRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const handleSetTab = (tab: CampaignTab) => {
    setActiveTab(tab);
  };

  const handleWeekChange = (value: string) => {
    const nextWeek = Number(value);
    setWeek(nextWeek);
    setPage(1);
    showToast(`Switched to Week ${nextWeek}`);
  };

  const changePage = (delta: number) => {
    setPage((prev) => Math.min(totalPages, Math.max(1, prev + delta)));
  };

  const submitPageInput = () => {
    const parsed = Number(pageInput);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= totalPages) {
      setPage(Math.floor(parsed));
    } else {
      setPageInput(String(page));
    }
  };

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    setCountdownLabel(getCountdownLabel(campaign, week));
    setStatus(getCampaignStatus(campaign));
    const intervalId = window.setInterval(() => {
      setCountdownLabel(getCountdownLabel(campaign, week));
      setAvailableWeeks(getAvailableWeeks(campaign));
      setStatus(getCampaignStatus(campaign));
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [campaign, week]);

  useEffect(() => {
    const maxUnlocked = getUnlockedWeek(campaign);
    if (week > maxUnlocked) {
      setWeek(maxUnlocked);
      setPage(1);
    }
  }, [campaign, availableWeeks, week]);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const statusTone =
    status === "Active" ? "success" : status === "Upcoming" ? "warning" : "neutral";

  const leaderboardColumns = [
    {
      key: "rank",
      title: "Rank",
      render: (row: LeaderboardRow) => <span className={styles.rank}>{row.rank}</span>,
    },
    {
      key: "address",
      title: "Address",
      render: (row: LeaderboardRow) => (
        <span className={styles.addressCell}>
          <span className={styles.avatar} aria-hidden="true" />
          <span>{shortenAddress(row.address)}</span>
        </span>
      ),
    },
    {
      key: "minSupplyUsd",
      title: "Min Supply USD",
      align: "right" as const,
      render: (row: LeaderboardRow) => formatUsd(row.minSupplyUsd),
    },
    {
      key: "minBorrowUsd",
      title: "Min Borrow USD",
      align: "right" as const,
      render: (row: LeaderboardRow) => formatUsd(row.minBorrowUsd),
    },
    {
      key: "share",
      title: "Share",
      align: "right" as const,
      render: (row: LeaderboardRow) => {
        const total = leaderboard.data?.totalPoints ?? 0n;
        const share = total > 0n ? Number((row.weeklyPoints * 10_000n) / total) / 10_000 : 0;
        return formatShare(share);
      },
    },
    {
      key: "points",
      title: REWARD_TOKEN,
      align: "right" as const,
      render: (row: LeaderboardRow) => {
        const isGalxeOnly = row.minSupplyUsd === 0n && row.minBorrowUsd === 0n;
        const galxePoints = isGalxeOnly ? row.weeklyPoints : 0n;
        const onchainPoints = isGalxeOnly ? 0n : row.weeklyPoints;
        return (
          <div className={styles.pointsBreakdown}>
            <div className={styles.pointsTotal}>{formatPoints(row.weeklyPoints)}</div>
            <div className={styles.pointsRow}>
              <span className={styles.pointsLabel}>onchain</span>
              <span>{formatPoints(onchainPoints)}</span>
            </div>
            <div className={styles.pointsRow}>
              <span className={styles.pointsLabel}>galxe</span>
              <span>{formatPoints(galxePoints)}</span>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.eyebrow}>
            <span className={styles.statusDot} data-tone={statusTone} aria-hidden="true" />
            <Badge tone={statusTone}>{status}</Badge>
          </div>
          <PageHeader
            title="Velkonix Genesis Season 1"
            subtitle={`Earn ${REWARD_TOKEN} through sustained liquidity participation and ecosystem contribution. Weekly rankings are based on eligible campaign balances.`}
          />
          <div className={styles.heroActions}>
            <Button variant="secondary" onClick={() => handleSetTab("leaderboard")}>
              View Leaderboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(MISSIONS_URL, "_blank", "noopener,noreferrer")}
            >
              Explore Missions
            </Button>
            <Button variant="secondary" onClick={() => handleSetTab("rules")}>
              View Rules
            </Button>
            <Button variant="ghost" onClick={() => setHowItWorksOpen(true)}>
              How It Works
            </Button>
          </div>
        </div>

        <div className={styles.heroSide}>
          <MetricTile title="Reward token" value={REWARD_TOKEN} tone="subtle" />
          <MetricTile
            title="Season 1 dates"
            value={getCampaignDatesLabel(campaign) || "TBA"}
            tone="subtle"
          />
          <MetricTile title="Next update" value={countdownLabel} tone="subtle" />
        </div>
      </section>

      <Card className={styles.weekRow}>
        <div>
          <Typography as="span" variant="caption" muted>
            Week
          </Typography>
          <Typography as="p" variant="body" muted className={styles.weekHint}>
            Choose the campaign week you want to view.
          </Typography>
        </div>
        <Dropdown
          className={styles.weekSelect}
          ariaLabel="Campaign week"
          value={String(week)}
          onChange={handleWeekChange}
          options={availableWeeks.map((w) => ({ value: String(w), label: `Week ${w}` }))}
        />
      </Card>

      <Tabs items={TABS} activeId={activeTab} onChange={(id) => handleSetTab(id as CampaignTab)} />

      <div className={styles.tabPanel}>
        {activeTab === "leaderboard" && (
          <Card
            title="Leaderboard"
            subtitle="Season 1 weekly balances."
            actions={<Badge>{lastUpdatedLabel}</Badge>}
          >
            {leaderboard.isError ? (
              <ErrorState
                title="Failed to load leaderboard"
                description={
                  <Button variant="ghost" onClick={() => leaderboard.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : leaderboardEmpty ? (
              <EmptyState
                title="No data yet"
                description="Leaderboard will appear when weekly results are finalized."
              />
            ) : (
              <>
                <Table
                  className={styles.leaderboardTable}
                  columns={leaderboardColumns}
                  rows={currentRows}
                  getRowKey={(row) => `${row.rank}-${row.address}`}
                />
                <div className={styles.pagination}>
                  <Button variant="ghost" onClick={() => changePage(-1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <div className={styles.pageGroup}>
                    <Typography as="span" variant="caption" muted>
                      Page
                    </Typography>
                    <input
                      className={styles.pageInput}
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      onFocus={(event) => event.target.select()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                      onBlur={submitPageInput}
                    />
                    <Typography as="span" variant="caption" muted>
                      {`of ${totalPages}`}
                    </Typography>
                  </div>
                  <div className={styles.pageGroup}>
                    <Button
                      variant="ghost"
                      onClick={() => changePage(1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <Card
              title={`Your Week ${week} overview`}
              subtitle={
                connected
                  ? `Your Week ${week} ${REWARD_TOKEN} summary.`
                  : `Connect wallet to view your ${REWARD_TOKEN} balance for the selected week.`
              }
              actions={!connected ? <Badge tone="warning">Wallet not connected</Badge> : undefined}
            >
              {connected ? (
                userStats.isLoading ? (
                  <EmptyState title="Loading…" description="Fetching weekly snapshot." />
                ) : userStats.data ? (
                  <div className={styles.metricGrid}>
                    <MetricTile
                      title="Total earned"
                      value={`${formatPoints(userStats.data.cumulativePoints)} ${REWARD_TOKEN}`}
                    />
                    <MetricTile
                      title="Selected week earned"
                      value={`${formatPoints(userStats.data.weeklyPoints)} ${REWARD_TOKEN}`}
                    />
                    <MetricTile title="Rank" value={`#${userStats.data.rank}`} />
                    <MetricTile title="User share" value={formatShare(userStats.data.share)} />
                    <MetricTile title="Supply USD" value={formatUsd(userStats.data.minSupplyUsd)} />
                    <MetricTile title="Borrow USD" value={formatUsd(userStats.data.minBorrowUsd)} />
                  </div>
                ) : (
                  <EmptyState
                    title="No activity this week"
                    description={`Your address is not in the Week ${week} snapshot. Participate to appear on the leaderboard.`}
                  />
                )
              ) : (
                <EmptyState
                  title="Connect wallet"
                  description={`Leaderboard is public. Connect your wallet to see your ${REWARD_TOKEN} overview for the selected week.`}
                />
              )}
            </Card>
            <ClaimCard />
          </div>
        )}

        {activeTab === "rules" && (
          <Card
            title="Rules & FAQ"
            subtitle={`How Season 1 ${REWARD_TOKEN} balances are calculated.`}
          >
            <div className={styles.rules}>
              {RULES.map((rule, index) => (
                <details key={rule.title} className={styles.rule} open={index === 0}>
                  <summary className={styles.ruleSummary}>{rule.title}</summary>
                  <p className={styles.ruleText}>{rule.text}</p>
                </details>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        title="How it works"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setHowItWorksOpen(false)}>
            Close
          </Button>
        }
      >
        <Typography as="p" variant="body" muted>
          Each weekly update is based on the lowest eligible supply and borrow balances recorded
          during the selected campaign period. This approach rewards sustained liquidity
          participation and reduces the impact of temporary balance spikes or short-term deposits.
          Final weekly rankings and {REWARD_TOKEN} allocations are calculated from these finalized
          balances.
        </Typography>
      </Modal>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </PageContainer>
  );
}
