import { classNames } from "../utilities/classNames";
import styles from "./HealthFactorBar.module.css";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const thumbPercent = (healthFactor: number): number => {
  if (!Number.isFinite(healthFactor)) {
    return 100;
  }
  if (healthFactor <= 1) {
    return 6;
  }
  return clamp(6 + ((Math.min(healthFactor, 3) - 1) / 2) * 94, 0, 100);
};

type HealthFactorBarProps = {
  healthFactor: number;
  className?: string;
};

export function HealthFactorBar({ healthFactor, className }: HealthFactorBarProps) {
  const pct = thumbPercent(healthFactor);
  const label = Number.isFinite(healthFactor)
    ? `Health factor ${healthFactor.toFixed(2)}`
    : "Health factor: no debt";
  return (
    <div className={classNames(styles.track, className)} role="img" aria-label={label}>
      <span className={styles.thumb} style={{ left: `${pct}%` }} />
    </div>
  );
}
