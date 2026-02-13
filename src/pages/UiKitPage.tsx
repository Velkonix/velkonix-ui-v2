import { useState } from "react";
import { useEffect } from "react";

import {
  ActionButton,
  AmountInput,
  ApyCell,
  ApproveButton,
  AssetCell,
  BackButton,
  Badge,
  Button,
  Card,
  Checkbox,
  ClaimButton,
  Divider,
  EmptyState,
  ErrorState,
  Footer,
  Header,
  Icon,
  IconButton,
  InfoTableCard,
  Input,
  InputGroup,
  Link,
  Modal,
  MetricTile,
  MetricText,
  NumberInput,
  PageContainer,
  PageHeader,
  PanelHeader,
  PanelHeaderStat,
  Section,
  Select,
  Skeleton,
  Spacer,
  Spinner,
  Switch,
  Table,
  TimeSeriesChart,
  Tabs,
  Toast,
  Tooltip,
  TxStatus,
  Typography,
  ValueCell,
  WalletBalanceCard,
  WalletConnectButton,
  WalletMenu,
} from "../shared/ui";
import styles from "./UiKitPage.module.css";

const THEME_OPTIONS = [
  { value: "blue", label: "Blue" },
] as const;

type ThemeName = (typeof THEME_OPTIONS)[number]["value"];

type MarketRow = {
  asset: string;
  name: string;
  supplied: string;
  apy: string;
};

const markets: MarketRow[] = [
  { asset: "ETH", name: "Ethereum", supplied: "$12.4M", apy: "3.2%" },
  { asset: "USDC", name: "USD Coin", supplied: "$8.1M", apy: "2.1%" },
];

const infoRows = [
  { metric: "Supply APY", value: "3.20%" },
  { metric: "Total supplied", value: "12,400.00 ETH" },
  { metric: "Utilization Rate", value: "65.32%" },
  { metric: "Max LTV", value: "75.00%" },
];

const chartSeries = Array.from({ length: 400 }, (_, index) => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const timestamp = now - (399 - index) * dayMs;
  const waveA = Math.sin(index / 18) * 110;
  const waveB = Math.cos(index / 37) * 70;
  const trend = index * 2.2;
  return {
    date: timestamp,
    value: 5_000 + trend + waveA + waveB,
  };
});

export function UiKitPage() {
  const [activeTab, setActiveTab] = useState("convert");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountValue, setAmountValue] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeName>("blue");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (typeof fetch !== "function") {
      return;
    }
    fetch("http://127.0.0.1:7242/ingest/79658062-1f9f-451c-9869-7f640578985d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "e2e-debug-1",
        hypothesisId: "H4",
        location: "src/pages/UiKitPage.tsx:65",
        message: "UiKitPage mounted",
        data: { reason: "mock branch not selected" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);

  const headerDemoNav = (
    <div className={styles.headerDemoNav}>
      <Link href="#" className={styles.headerDemoLink}>
        Markets
      </Link>
      <Link href="#" className={styles.headerDemoLink}>
        Dashboard
      </Link>
      <Link href="#" className={styles.headerDemoLinkActive}>
        Staking
      </Link>
    </div>
  );

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Velkonix UI Kit"
        subtitle="Inspect components in the active blue color scheme."
        actions={
          <div className={styles.pageHeaderActions}>
            <Select
              label="Color scheme"
              value={activeTheme}
              options={THEME_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              onChange={(event) => setActiveTheme(event.target.value as ThemeName)}
            />
            <WalletConnectButton />
          </div>
        }
        className={styles.pageHeader}
      />

      <Section title="1. Base / Foundation">
        <Card title="Buttons & Links">
          <div className={styles.row}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className={styles.row}>
            <IconButton
              label="Settings"
              icon={
                <Icon size={18}>
                  <circle cx="9" cy="9" r="8" fill="currentColor" />
                </Icon>
              }
            />
            <Link href="#">Inline link</Link>
          </div>
        </Card>
        <Card title="Typography">
          <Typography as="h1" variant="headline">
            H1 — Velkonix Markets
          </Typography>
          <Typography as="h2" variant="title">
            H2 — Supply overview
          </Typography>
          <Typography>Body text for metrics and descriptions.</Typography>
          <Typography variant="label">Label / micro copy</Typography>
          <Typography variant="microcaption">Microcaption / action helper text</Typography>
          <div className={styles.statPillsDemo}>
            <div className={styles.statPill}>
              <Typography as="span" variant="caption" muted>
                Balance
              </Typography>
              <Typography as="span">12,450.00</Typography>
            </div>
            <div className={styles.statPill}>
              <Typography as="span" variant="caption" muted>
                APY
              </Typography>
              <Typography as="span">3.42%</Typography>
            </div>
          </div>
        </Card>
        <Card title="Divider / Spacer / Icon">
          <Typography muted>Above divider</Typography>
          <Divider />
          <Typography muted>Below divider</Typography>
          <Spacer size={12} />
          <Icon size={20} aria-label="token">
            <circle cx="10" cy="10" r="8" fill="currentColor" />
          </Icon>
        </Card>
      </Section>

      <Section title="2. Inputs & Controls">
        <Card>
          <div className={styles.inputsGrid}>
            <Input label="TextInput" placeholder="Enter amount" />
            <NumberInput label="NumberInput" placeholder="0.00" />
            <InputGroup label="InputGroup" prefix="MAX">
              <input placeholder="0.00" />
            </InputGroup>
            <Select
              label="Select"
              options={[
                { label: "Supply", value: "supply" },
                { label: "Borrow", value: "borrow" },
              ]}
            />
          </div>
          <div className={styles.amountDemo}>
            <AmountInput
              label="AmountInput"
              placeholder="0.00"
              assetLabel="USDC"
              assetIcon={
                <Icon size={16} aria-label="USDC token icon">
                  <circle cx="10" cy="10" r="8" fill="currentColor" />
                </Icon>
              }
              balanceLabel="Available"
              balanceValue="1,250.45"
              usdValue="$125.04"
              maxValue="1250.45"
              value={amountValue}
              onChange={(event) => setAmountValue(event.target.value)}
            />
          </div>
          <div className={styles.row}>
            <Switch label="Collateral toggle" variant="collateral" />
            <Checkbox label="Agree to terms" />
          </div>
          <Tabs
            items={[
              { id: "convert", label: "Convert" },
              { id: "stake", label: "Stake" },
              { id: "rewards", label: "Rewards" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </Card>
      </Section>

      <Section title="3. Feedback & States">
        <Card>
          <div className={styles.row}>
            <Spinner />
            <Badge>Default</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="error">Error</Badge>
            <Tooltip content="APY details">
              <Badge>Tooltip</Badge>
            </Tooltip>
          </div>
          <div className={styles.gridTwo}>
            <Skeleton height={14} />
            <Skeleton height={14} />
          </div>
          <div className={styles.gridTwo}>
            <Toast tone="success" title="Supply completed">
              You supplied 1.2 ETH
            </Toast>
            <Toast tone="error" title="Transaction failed">
              Retry the operation
            </Toast>
          </div>
          <div className={styles.gridTwo}>
            <EmptyState title="No positions" description="You have no open borrows." />
            <ErrorState title="Data error" description="Failed to load markets." />
          </div>
        </Card>
      </Section>

      <Section title="4. Data Display">
        <Card>
          <PanelHeader
            title="Panel header"
            details={
              <>
                <PanelHeaderStat label="Balance" value="12,450.00" />
                <PanelHeaderStat label="APY" value="3.42%" />
              </>
            }
          />
          <div className={styles.metricTilesDemo}>
            <MetricTile
              title="Total supplied"
              value="$12.45M"
              media={
                <Icon size={18} aria-label="Total supplied icon">
                  <path
                    d="M4 14.5h12M6 11.5l2.2-3.1 2.3 1.8 2.5-4.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="8.2" cy="8.4" r="1" fill="currentColor" />
                  <circle cx="10.5" cy="10.2" r="1" fill="currentColor" />
                  <circle cx="13" cy="6" r="1" fill="currentColor" />
                </Icon>
              }
            />
            <MetricTile
              title="Claimable rewards"
              value="348.12 VELK"
              tone="subtle"
              media={
                <Icon size={18} aria-label="Claimable rewards icon">
                  <path
                    d="M10 3.8 12 7.7l4.3.6-3.1 2.9.8 4.2-4-2.1-4 2.1.8-4.2L3.7 8.3 8 7.7Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </Icon>
              }
            />
          </div>
          <div className={styles.metricTextDemo}>
            <MetricText
              title="Ethereum"
              value="ETH"
              icon={
                <Icon size={16} aria-label="ETH icon">
                  <circle cx="8" cy="8" r="6" fill="currentColor" />
                </Icon>
              }
              iconAlt="Ethereum icon"
            />
            <MetricText title="Reserve size" value="4,218.00 ETH" />
          </div>
          <Table<MarketRow>
            columns={[
              {
                key: "asset",
                title: "Asset",
                render: (row) => <AssetCell symbol={row.asset} name={row.name} />,
              },
              {
                key: "supplied",
                title: "Total Supplied",
                align: "right",
                render: (row) => <ValueCell>{row.supplied}</ValueCell>,
              },
              {
                key: "apy",
                title: "Supply APY",
                align: "right",
                render: (row) => <ApyCell>{row.apy}</ApyCell>,
              },
            ]}
            rows={markets}
            getRowKey={(row) => row.asset}
          />
          <InfoTableCard title="Your supplies" rows={infoRows} getRowKey={(row) => String(row.metric)} />
        </Card>
        <Card title="Time series chart" subtitle="Neon style UI Kit line chart with simple interactions.">
          <div className={styles.chartDemo}>
            <TimeSeriesChart
              data={chartSeries}
              ariaLabel="UI kit time series"
              emptyTitle="Нет данных в демо-серии"
              emptyDescription="Добавьте хотя бы одну точку для отображения графика."
            />
          </div>
        </Card>
      </Section>

      <Section title="5. Modals & Overlays">
        <Card>
          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          <Modal
            isOpen={isModalOpen}
            title="Confirm action"
            onClose={() => setIsModalOpen(false)}
            footer={<Button onClick={() => setIsModalOpen(false)}>Close</Button>}
          >
            <Typography>Review transaction details before confirming.</Typography>
          </Modal>
        </Card>
      </Section>

      <Section title="6. Web3 / Protocol-specific">
        <Card>
          <WalletBalanceCard value="12,450.00 VELK" />
          <Spacer size={12} />
          <div className={styles.row}>
            <WalletConnectButton />
            <WalletMenu />
            <ApproveButton />
            <ActionButton label="Deposit" />
            <ClaimButton />
          </div>
          <div className={styles.row}>
            <TxStatus status="pending" />
            <TxStatus status="success" />
            <TxStatus status="failed" />
          </div>
        </Card>
      </Section>

      <Section title="7. Layout & Navigation">
        <Card>
          <div className={styles.headerDemoStack}>
            <div className={styles.headerDemoHint}>
              Resize viewport to 768px or less to validate burger menu layout, link alignment, and actions placement.
            </div>
            <div className={styles.headerDemoFrame}>
              <Header logo={<span>Velkonix</span>} nav={headerDemoNav} actions={<WalletConnectButton />} />
            </div>
            <div className={`${styles.headerDemoFrame} ${styles.headerDemoMobileViewport}`}>
              <Header logo={<span>Velkonix</span>} nav={headerDemoNav} actions={<WalletConnectButton />} />
            </div>
          </div>
          <Spacer size={12} />
          <BackButton />
          <Spacer size={12} />
          <Footer
            links={
              <div className={styles.row}>
                <Link href="#">X</Link>
                <Link href="#">Discord</Link>
                <Link href="#">GitHub</Link>
                <Link href="#">GitBook</Link>
              </div>
            }
            label="Velkonix"
          />
        </Card>
      </Section>

      <Section title="8. Domain Components (Feature-level)">
        <div className={styles.gridThree}>
          <Card title="MarketsTable">
            <Typography muted>Sortable markets list.</Typography>
          </Card>
          <Card title="UserSummary">
            <Typography muted>Net worth, APY, claim.</Typography>
          </Card>
          <Card title="Asset Panels">
            <Typography muted>Supply / Borrow panels.</Typography>
          </Card>
          <Card title="Staking Blocks">
            <Typography muted>Convert, Stake, Rewards, Exit.</Typography>
          </Card>
        </div>
      </Section>

      <Section title="9. Utility">
        <Card>
          <div className={styles.utility}>
            FormatNumber(12345.678) → 12,345.68
            <br />
            FormatApy(0.0321) → 3.21%
            <br />
            FormatAddress(0x18d3c4a1...7f2a)
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
