import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useLendingController, type MarketRow, type MarketSortKey } from "../features/lending";
import {
  ApyCell,
  AssetCell,
  Card,
  EmptyState,
  Icon,
  MetricTile,
  Modal,
  PageContainer,
  PageHeader,
  Section,
  Table,
  ValueCell,
} from "../shared/ui";
import styles from "./MarketsPage.module.css";

type ApyModalState = {
  assetSymbol: string;
  metric: "supply" | "borrow";
  apy: number;
} | null;

type MobileMetricRow = {
  key: string;
  label: string;
  value: ReactNode;
};

const formatAmount = (value: number): string => value.toLocaleString();
const formatUsd = (value: number): string =>
  `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

export function MarketsPage() {
  const navigate = useNavigate();
  const { marketRows, setSort, sortDirection, sortKey } = useLendingController();
  const [apyModal, setApyModal] = useState<ApyModalState>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncIsMobile = () => {
      setIsMobile(mediaQueryList.matches);
    };
    syncIsMobile();
    mediaQueryList.addEventListener("change", syncIsMobile);

    return () => {
      mediaQueryList.removeEventListener("change", syncIsMobile);
    };
  }, []);

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

  const openApyModal = (
    event: MouseEvent<HTMLButtonElement>,
    row: MarketRow,
    metric: "supply" | "borrow"
  ) => {
    event.stopPropagation();
    setApyModal({
      assetSymbol: row.symbol,
      metric,
      apy: metric === "supply" ? row.supplyApy : row.borrowApy,
    });
  };

  const renderMobileMetricsTable = (row: MarketRow) => {
    const mobileMetricRows: MobileMetricRow[] = [
      {
        key: "totalSupplied",
        label: "Total Supplied",
        value: <ValueCell>{formatAmount(row.totalSupplied)}</ValueCell>,
      },
      {
        key: "supplyApy",
        label: "Supply APY",
        value: (
          <button type="button" className={styles.apyButton} onClick={(event) => openApyModal(event, row, "supply")}>
            <ApyCell>{row.supplyApy.toFixed(2)}%</ApyCell>
          </button>
        ),
      },
      {
        key: "totalBorrowed",
        label: "Total Borrowed",
        value: <ValueCell>{formatAmount(row.totalBorrowed)}</ValueCell>,
      },
      {
        key: "borrowApy",
        label: "Borrow APY",
        value: (
          <button type="button" className={styles.apyButton} onClick={(event) => openApyModal(event, row, "borrow")}>
            <ApyCell>{row.borrowApy.toFixed(2)}%</ApyCell>
          </button>
        ),
      },
    ];

    return (
      <Table
        className={styles.mobileMetricsTable}
        columns={[
          {
            key: "label",
            title: "Metric",
            render: (metricRow) => <ValueCell tone="muted">{metricRow.label}</ValueCell>,
          },
          {
            key: "value",
            title: "Value",
            align: "right",
            render: (metricRow) => metricRow.value,
          },
        ]}
        rows={mobileMetricRows}
        getRowKey={(metricRow) => metricRow.key}
      />
    );
  };

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
        <div className={styles.summaryGrid}>
          <MetricTile
            title="Total market size"
            value={formatUsd(marketSummary.totalMarketSize)}
            media={
              <Icon size={18} aria-label="Total market size icon">
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
            title="Total available"
            value={formatUsd(marketSummary.totalAvailable)}
            media={
              <Icon size={18} viewBox="0 0 1024 1024" aria-label="Total available icon">
                <path
                  d="M951.87 253.86c0-82.18-110.05-144.14-256-144.14s-256 61.96-256 144.14c0 0.73 0.16 1.42 0.18 2.14h-0.18v109.71h73.14v-9.06c45.77 25.81 109.81 41.33 182.86 41.33 67.39 0 126.93-13.33 171.71-35.64 6.94 7.18 11.15 14.32 11.15 20.58 0 28.25-72.93 70.98-182.86 70.98h-73.12v73.14h73.12c67.4 0 126.96-13.33 171.74-35.65 6.95 7.17 11.11 14.31 11.11 20.6 0 28.27-72.93 71-182.86 71l-25.89 0.12c-15.91 0.14-31.32 0.29-46.34-0.11l-1.79 73.11c8.04 0.2 16.18 0.27 24.48 0.27 7.93 0 16-0.05 24.2-0.12l25.34-0.12c67.44 0 127.02-13.35 171.81-35.69 6.97 7.23 11.04 14.41 11.04 20.62 0 28.27-72.93 71-182.86 71h-73.12v73.14h73.12c67.44 0 127.01-13.35 171.81-35.69 6.98 7.22 11.05 14.4 11.05 20.62 0 28.27-72.93 71-182.86 71h-73.12v73.14h73.12c145.95 0 256-61.96 256-144.14 0-0.68-0.09-1.45-0.11-2.14h0.11V256h-0.18c0.03-0.72 0.2-1.42 0.2-2.14z m-438.86 0c0-28.27 72.93-71 182.86-71s182.86 42.73 182.86 71c0 28.25-72.93 70.98-182.86 70.98s-182.86-42.73-182.86-70.98z"
                  fill="currentColor"
                />
                <path
                  d="M330.15 365.71c-145.95 0-256 61.96-256 144.14 0 0.73 0.16 1.42 0.18 2.14h-0.18v256c0 82.18 110.05 144.14 256 144.14s256-61.96 256-144.14V512h-0.18c0.02-0.72 0.18-1.42 0.18-2.14 0-82.18-110.05-144.15-256-144.15zM147.29 638.93c0-6.32 4.13-13.45 11.08-20.62 44.79 22.33 104.36 35.67 171.78 35.67 67.39 0 126.93-13.33 171.71-35.64 6.94 7.18 11.15 14.32 11.15 20.58 0 28.25-72.93 70.98-182.86 70.98s-182.86-42.72-182.86-70.97z m182.86-200.07c109.93 0 182.86 42.73 182.86 71 0 28.25-72.93 70.98-182.86 70.98s-182.86-42.73-182.86-70.98c0-28.27 72.93-71 182.86-71z m0 400.14c-109.93 0-182.86-42.73-182.86-71 0-6.29 4.17-13.43 11.11-20.6 44.79 22.32 104.34 35.66 171.75 35.66 67.4 0 126.96-13.33 171.74-35.65 6.95 7.17 11.11 14.31 11.11 20.6 0.01 28.26-72.92 70.99-182.85 70.99z"
                  fill="currentColor"
                />
              </Icon>
            }
          />
          <MetricTile
            title="Total borrows"
            value={formatUsd(marketSummary.totalBorrows)}
            media={
              <Icon size={18} viewBox="-3.5 0 19 19" aria-label="Total borrows icon">
                <path
                  d="m8.266 2.549 2.893 2.893v10.69a.476.476 0 0 1-.475.474H1.316a.476.476 0 0 1-.475-.475V3.024a.476.476 0 0 1 .475-.475zM1.95 3.657v11.84h8.102v-9.29H8.058a.576.576 0 0 1-.574-.574V3.657zm3.573 3.478a1.033 1.033 0 0 1 .256.678 1.009 1.009 0 0 1-.506.872 1.602 1.602 0 0 1-.487.206V9.1a.396.396 0 1 1-.792 0v-.204a1.813 1.813 0 0 1-.31-.099 1.143 1.143 0 0 1-.44-.322.396.396 0 1 1 .598-.518.373.373 0 0 0 .136.105 1.016 1.016 0 0 0 .19.062 1.537 1.537 0 0 0 .208.025.918.918 0 0 0 .466-.128c.145-.094.145-.171.145-.208a.243.243 0 0 0-.06-.157.58.58 0 0 0-.153-.123.787.787 0 0 0-.19-.069.907.907 0 0 0-.19-.019 1.985 1.985 0 0 1-.329-.026 1.514 1.514 0 0 1-.426-.137 1.239 1.239 0 0 1-.406-.327 1.052 1.052 0 0 1-.242-.66 1.065 1.065 0 0 1 .53-.9 1.583 1.583 0 0 1 .473-.196V5a.396.396 0 0 1 .792 0v.21a1.856 1.856 0 0 1 .316.112 1.318 1.318 0 0 1 .386.265.396.396 0 1 1-.56.561.529.529 0 0 0-.15-.104 1.037 1.037 0 0 0-.197-.069l-.021-.004a1.015 1.015 0 0 0-.16-.028.901.901 0 0 0-.457.122.283.283 0 0 0-.16.232.272.272 0 0 0 .064.16.454.454 0 0 0 .146.118.736.736 0 0 0 .202.064 1.197 1.197 0 0 0 .2.016 1.695 1.695 0 0 1 .357.037 1.584 1.584 0 0 1 .391.141 1.372 1.372 0 0 1 .38.303zm3.391 3.436H3.091v1.108h5.822zm0 2.499H3.091v1.108h5.822zm0-4.997H6.501V9.18h2.412z"
                  fill="currentColor"
                />
              </Icon>
            }
          />
        </div>
      </Section>

      <Section>
        {marketRows.length === 0 ? (
          <Card>
            <EmptyState title="No markets available" description="Try again after data provider is ready." />
          </Card>
        ) : isMobile ? (
          <div className={styles.mobileList}>
            {marketRows.map((row) => (
              <Card
                key={row.id}
                className={styles.mobileAssetPanel}
                onClick={() => navigate(`/asset/${row.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/asset/${row.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className={styles.mobileAssetHeader}>
                  <AssetCell symbol={row.symbol} name={row.name} />
                </div>
                {renderMobileMetricsTable(row)}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
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
                      onClick={(event) => openApyModal(event, row, "supply")}
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
                      onClick={(event) => openApyModal(event, row, "borrow")}
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
          </Card>
        )}
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
