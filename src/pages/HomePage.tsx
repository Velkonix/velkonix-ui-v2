import { Button, Typography } from "../shared/ui";
import styles from "./HomePage.module.css";

export function HomePage() {
  const openPage = () => {
    window.location.assign("/markets?mock=1");
  };

  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.heroCenter}>
          <div className={styles.titleWrap}>
            <h1 className={styles.heroTitle}>
              VELKONIX
            </h1>
          </div>

          <div className={styles.pitch}>
            <Typography as="p" variant="label" align="center" className={styles.pitchPrimary}>
              battle-tested defi mechanics - back on <strong>ethereum</strong>.
            </Typography>
            <Typography as="p" variant="microcaption" align="center" className={styles.pitchSecondary}>
              vanilla lending. real tokenomics. no experiments.
            </Typography>
          </div>
        </div>

        <div className={styles.centerAction}>
          <Button size="md" onClick={openPage} className={styles.superButton}>
            <span className={styles.superButtonLabel}>Open App</span>
          </Button>
        </div>
      </section>
    </div>
  );
}
