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
  Input,
  InputGroup,
  Link,
  Modal,
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

export function UiKitPage() {
  const [activeTab, setActiveTab] = useState("convert");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountValue, setAmountValue] = useState("");

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
        subtitle="Amber / Gold theme applied to all primitives."
        actions={<WalletConnectButton />}
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
            <Switch label="Collateral toggle" />
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
