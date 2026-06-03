import { useState, type MouseEvent } from "react";

import { formatNumber } from "../../lib/numberFormat";
import { classNames } from "../utilities/classNames";
import { Modal } from "../modals/Modal";
import { Typography } from "../foundation/Typography";
import { ValueCell } from "./ValueCell";
import { ApyCell } from "./ApyCell";
import styles from "./ApyWithDetails.module.css";

export type ApyRewardDetailsItem = {
  tokenSymbol: string;
  source: string;
  apy: number;
};

type ApyWithDetailsProps = {
  title: string;
  totalApy: number;
  baseApy: number;
  rewardApyTotal: number;
  rewards?: ApyRewardDetailsItem[];
  side?: "supply" | "borrow";
  stopPropagation?: boolean;
  className?: string;
  valueClassName?: string;
};

const formatPercent = (value: number): string =>
  `${formatNumber(value, { decimals: 2, compact: false })}%`;
const formatPositivePercent = (value: number): string =>
  `+${formatNumber(Math.abs(value), { decimals: 2, compact: false })}%`;

export function ApyWithDetails({
  title,
  totalApy,
  baseApy,
  rewardApyTotal,
  rewards,
  side = "supply",
  stopPropagation = false,
  className,
  valueClassName,
}: ApyWithDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    setIsOpen(true);
  };

  const baseLabel = side === "borrow" ? "Net Borrow APY" : "Net Supply APY";
  const effectiveLabel = side === "borrow" ? "Effective Borrow APY" : "Effective Supply APY";
  const totalLabel = "Net APY";

  return (
    <>
      <button type="button" className={classNames(styles.trigger, className)} onClick={onClick}>
        <ApyCell className={classNames(styles.apyValue, valueClassName)}>
          {formatPercent(totalApy)}
        </ApyCell>
      </button>

      <Modal isOpen={isOpen} title={title} onClose={() => setIsOpen(false)}>
        <div className={styles.content}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <ValueCell className={styles.summaryLabel}>{baseLabel}</ValueCell>
              <ApyCell>{formatPercent(baseApy)}</ApyCell>
            </div>
            <div className={styles.summaryRow}>
              <ValueCell className={styles.summaryLabel}>{effectiveLabel}</ValueCell>
              <ValueCell className={styles.rewardTotalPositive}>
                {formatPositivePercent(rewardApyTotal)}
              </ValueCell>
            </div>
            <div className={styles.summaryRow}>
              <ValueCell className={styles.summaryLabel}>{totalLabel}</ValueCell>
              <ApyCell>{formatPercent(totalApy)}</ApyCell>
            </div>
          </div>

          {rewards ? (
            rewards.length > 0 ? (
              <div className={styles.rewardsList}>
                {rewards.map((reward, index) => (
                  <div
                    className={styles.rewardItem}
                    key={`${reward.tokenSymbol}-${reward.source}-${index}`}
                  >
                    <div className={styles.rewardMeta}>
                      <Typography as="span" variant="label">
                        {reward.tokenSymbol}
                      </Typography>
                      <Typography as="span" variant="caption" muted>
                        {reward.source}
                      </Typography>
                    </div>
                    <ValueCell className={styles.rewardTotalPositive}>
                      {formatPositivePercent(reward.apy)}
                    </ValueCell>
                  </div>
                ))}
              </div>
            ) : (
              <Typography as="p" variant="caption" className={styles.emptyRewards}>
                No rewards available for this position yet.
              </Typography>
            )
          ) : null}
        </div>
      </Modal>
    </>
  );
}
