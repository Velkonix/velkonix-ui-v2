import { Button, Card, PageContainer, PageHeader, Section, Typography, WalletConnectButton, WalletMenu } from "../shared/ui";
import styles from "./HomePage.module.css";

export function HomePage() {
  const openPage = (path: string) => {
    window.location.assign(path);
  };

  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Velkonix Home"
        subtitle="Self-service DeFi interface for lending and staking."
        actions={
          <div className={styles.actions}>
            <WalletMenu />
            <WalletConnectButton />
          </div>
        }
      />

      <Section title="Welcome">
        <Card>
          <Typography>
            This is the main page of Velkonix UI. Connect wallet to access protocol actions in markets, asset pages,
            and staking modules.
          </Typography>
        </Card>
      </Section>

      <Section title="Quick Navigation">
        <Card>
          <div className={styles.navButtons}>
            <Button onClick={() => openPage("/?mock=1")}>Open App</Button>
            <Button variant="secondary" onClick={() => openPage("/markets?mock=1")}>
              Go to Markets
            </Button>
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
