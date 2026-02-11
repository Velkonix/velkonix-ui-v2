import type { HTMLAttributes, ReactNode } from "react";

import { Icon } from "../foundation/Icon";
import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./WalletBalanceCard.module.css";

type WalletBalanceIcon = "wallet" | "reward";

type WalletBalanceCardProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  value: ReactNode;
  icon?: WalletBalanceIcon;
};

const renderIcon = (icon: WalletBalanceIcon) => {
  if (icon === "reward") {
    return (
      <>
        <path d="M7 4.8h6v2.1a3 3 0 0 1-6 0z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.8 10h4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 10v3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.4 14.8h5.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 6.2H5.4a1.9 1.9 0 0 0 1.9 2.2h.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13 6.2h1.6a1.9 1.9 0 0 1-1.9 2.2h-.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    );
  }

  return (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.8 8.4h5v3.2h-5a1.6 1.6 0 1 1 0-3.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="13.8" cy="10" r="0.9" fill="currentColor" />
    </>
  );
};

export function WalletBalanceCard({
  label = "Wallet balance",
  value,
  icon = "wallet",
  className,
  ...props
}: WalletBalanceCardProps) {
  const iconSize = icon === "reward" ? 22 : 18;

  return (
    <div className={classNames(styles.root, className)} {...props}>
      <div className={styles.iconWrap}>
        <Icon size={iconSize} aria-label={icon === "reward" ? "Reward icon" : "Wallet icon"} className={styles.icon}>
          {renderIcon(icon)}
        </Icon>
      </div>
      <div className={styles.content}>
        <Typography as="span" variant="caption" muted>
          {label}
        </Typography>
        <Typography as="p" variant="body" className={styles.value}>
          {value}
        </Typography>
      </div>
    </div>
  );
}
