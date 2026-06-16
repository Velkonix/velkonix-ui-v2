import { getActiveNetworkConfig } from "../config/networks";
import { useUserTransactions } from "../features/subgraph";
import { Card, EmptyState, Link, PanelHeader, Section, Skeleton, Typography } from "../shared/ui";
import { formatNumber } from "../shared/lib/numberFormat";
import styles from "./RecentActivityPanel.module.css";

const ACTION_LABELS: Record<string, string> = {
  Supply: "Supplied",
  RedeemUnderlying: "Withdrew",
  Borrow: "Borrowed",
  Repay: "Repaid",
  UsageAsCollateral: "Collateral toggled",
  LiquidationCall: "Liquidated",
  SwapBorrowRate: "Swapped rate",
};

const formatAction = (action: string): string => ACTION_LABELS[action] ?? action;

const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type RecentActivityPanelProps = {
  user: string | null;
};

export function RecentActivityPanel({ user }: RecentActivityPanelProps) {
  const { data, loading, error } = useUserTransactions(user ?? undefined, 25);
  const explorerBaseUrl = getActiveNetworkConfig().explorerBaseUrl;

  if (!user) {
    return null;
  }

  return (
    <Section>
      <Card>
        <PanelHeader title="Recent activity" />
        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={18} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title="Couldn't load activity"
            description="The subgraph is unavailable right now."
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Your supplies, borrows, and repayments will appear here."
          />
        ) : (
          <ul className={styles.list}>
            {data.map((tx) => (
              <li key={tx.id} className={styles.row}>
                <div className={styles.left}>
                  <Typography as="span" className={styles.action}>
                    {formatAction(tx.action)}
                  </Typography>
                  {tx.symbol ? (
                    <Typography as="span" variant="caption" muted>
                      {tx.amount !== null ? `${formatNumber(tx.amount)} ` : ""}
                      {tx.symbol}
                    </Typography>
                  ) : null}
                </div>
                <div className={styles.right}>
                  <Typography as="span" variant="microcaption" muted>
                    {formatTimestamp(tx.timestamp)}
                  </Typography>
                  <Link
                    href={`${explorerBaseUrl}/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="View transaction on explorer"
                  >
                    ↗
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}
