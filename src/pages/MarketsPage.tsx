import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLendingController, type MarketSortKey } from "../features/lending";
import { ApyCell, AssetCell, Card, EmptyState, Modal, PageContainer, PageHeader, Section, Table, ValueCell } from "../shared/ui";
import styles from "./MarketsPage.module.css";

type ApyModalState = {
  assetSymbol: string;
  metric: "supply" | "borrow";
  apy: number;
} | null;

const formatAmount = (value: number): string => value.toLocaleString();
const formatUsd = (value: number): string =>
  `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;

export function MarketsPage() {
  const navigate = useNavigate();
  const { marketRows, setSort, sortDirection, sortKey } = useLendingController();
  const [apyModal, setApyModal] = useState<ApyModalState>(null);

  const marketSummary = useMemo(() => {
    const totalMarketSize = marketRows.reduce((sum, row) => sum + row.totalSupplied, 0);
    const totalBorrows = marketRows.reduce((sum, row) => sum + row.totalBorrowed, 0);
    const totalAvailable = marketRows.reduce((sum, row) => sum + Math.max(row.totalSupplied - row.totalBorrowed, 0), 0);

    return {
      totalMarketSize,
      totalAvailable,
      totalBorrows,
    };
  }, [marketRows]);

  const titleButton = (label: string, key: MarketSortKey) => (
    <button
      type="button"
      className={styles.sortButton}
      onClick={() => setSort(key)}
      aria-label={`Sort by ${label}${sortKey === key ? ` (${sortDirection === "asc" ? "ascending" : "descending"})` : ""}`}
      aria-pressed={sortKey === key}
    >
      <span>{label}</span>
      {sortKey === key ? (
        <span className={styles.sortArrow} aria-hidden="true">
          {sortDirection === "asc" ? "▲" : "▼"}
        </span>
      ) : null}
    </button>
  );

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Markets"
        subtitle="lend and borrow with predictable rules"
        titleAs="h2"
        subtitleVariant="label"
        className={styles.pageHeader}
      />

      <Section>
        <Card>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total market size</span>
              <span className={styles.summaryValue}>{formatUsd(marketSummary.totalMarketSize)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total available</span>
              <span className={styles.summaryValue}>{formatUsd(marketSummary.totalAvailable)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total borrows</span>
              <span className={styles.summaryValue}>{formatUsd(marketSummary.totalBorrows)}</span>
            </div>
          </div>
        </Card>
      </Section>

      <Section>
        <Card>
          {marketRows.length === 0 ? (
            <EmptyState title="No markets available" description="Try again after data provider is ready." />
          ) : (
            <Table
              columns={[
                {
                  key: "asset",
                  title: titleButton("Asset", "asset"),
                  render: (row) => <AssetCell symbol={row.symbol} name={row.name} />,
                },
                {
                  key: "totalSupplied",
                  title: titleButton("Total Supplied", "totalSupplied"),
                  align: "right",
                  render: (row) => <ValueCell>{formatAmount(row.totalSupplied)}</ValueCell>,
                },
                {
                  key: "supplyApy",
                  title: titleButton("Supply APY", "supplyApy"),
                  align: "right",
                  render: (row) => (
                    <button
                      type="button"
                      className={styles.apyButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setApyModal({
                          assetSymbol: row.symbol,
                          metric: "supply",
                          apy: row.supplyApy,
                        });
                      }}
                    >
                      <ApyCell>{row.supplyApy.toFixed(2)}%</ApyCell>
                    </button>
                  ),
                },
                {
                  key: "totalBorrowed",
                  title: titleButton("Total Borrowed", "totalBorrowed"),
                  align: "right",
                  render: (row) => <ValueCell>{formatAmount(row.totalBorrowed)}</ValueCell>,
                },
                {
                  key: "borrowApy",
                  title: titleButton("Borrow APY", "borrowApy"),
                  align: "right",
                  render: (row) => (
                    <button
                      type="button"
                      className={styles.apyButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setApyModal({
                          assetSymbol: row.symbol,
                          metric: "borrow",
                          apy: row.borrowApy,
                        });
                      }}
                    >
                      <ApyCell>{row.borrowApy.toFixed(2)}%</ApyCell>
                    </button>
                  ),
                },
              ]}
              rows={marketRows}
              getRowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/asset/${row.id}`)}
            />
          )}
        </Card>
      </Section>

      <Modal
        isOpen={apyModal !== null}
        title={apyModal ? `${apyModal.assetSymbol} ${apyModal.metric === "supply" ? "Supply" : "Borrow"} APY` : ""}
        onClose={() => setApyModal(null)}
      >
        {apyModal ? (
          <div className={styles.modalContent}>
            <ValueCell tone="muted">Current APY</ValueCell>
            <ApyCell>{apyModal.apy.toFixed(2)}%</ApyCell>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
