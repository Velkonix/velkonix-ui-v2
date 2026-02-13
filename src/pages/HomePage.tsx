import { useEffect, useState } from "react";
import { Button, Typography } from "../shared/ui";
import styles from "./HomePage.module.css";

const HERO_WORD = "VELKONIX";
const FLICKER_COUNT = 1;
const FLICKER_CYCLE_MS = 25000;

function pickRandomIndices(length: number, count: number, previousKey = ""): number[] {
  const target = Math.min(length, Math.max(0, count));
  if (target === 0) return [];

  let next: number[] = [];
  let key = "";
  let attempts = 0;

  do {
    const values = new Set<number>();
    while (values.size < target) {
      values.add(Math.floor(Math.random() * length));
    }
    next = [...values].sort((a, b) => a - b);
    key = next.join(",");
    attempts += 1;
  } while (key === previousKey && attempts < 8);

  return next;
}

export function HomePage() {
  const [flickerIndices, setFlickerIndices] = useState<number[]>(() =>
    pickRandomIndices(HERO_WORD.length, FLICKER_COUNT),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlickerIndices((prev) => pickRandomIndices(HERO_WORD.length, FLICKER_COUNT, prev.join(",")));
    }, FLICKER_CYCLE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const flickerSet = new Set(flickerIndices);

  const openPage = () => {
    window.location.assign("/markets");
  };

  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.heroCenter}>
          <div className={styles.titleWrap}>
            <h1 className={styles.heroTitle} data-text={HERO_WORD} aria-label={HERO_WORD}>
              {HERO_WORD.split("").map((char, index) => (
                <span
                  key={`${char}-${index}`}
                  aria-hidden="true"
                  className={flickerSet.has(index) ? styles.flickerLetter : undefined}
                >
                  {char}
                </span>
              ))}
            </h1>
          </div>

          <div className={styles.pitch}>
            <Typography as="p" variant="label" align="center" className={styles.pitchPrimary}>
              battle-tested defi mechanics - back on <strong>ethereum</strong>
            </Typography>
            <Typography as="p" variant="label" align="center" className={styles.pitchSecondary}>
              vanilla lending. real tokenomics. no experiments
            </Typography>
          </div>
        </div>

        <div className={styles.centerAction}>
          <Button size="md" onClick={openPage}>
            Open App
          </Button>
        </div>
      </section>
    </div>
  );
}
