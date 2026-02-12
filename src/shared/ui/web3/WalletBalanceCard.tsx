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
        <rect x="208.372" y="95.256" width="95.256" height="35.721" fill="currentColor" />
        <path
          d="M410.791,23.815H101.209C45.402,23.815,0,69.217,0,125.024s45.402,101.209,101.209,101.209h32.692c2.78,8.16,5.757,15.983,8.939,23.408c12.477,29.114,27.794,52.039,45.525,68.14c7.236,6.57,14.818,11.956,22.709,16.183c-9.165,14.095-11.029,31.584-5.584,47.059h-38.792v107.163h178.605V381.023h-38.793c5.445-15.474,3.582-32.964-5.583-47.059c7.891-4.227,15.473-9.613,22.709-16.183c17.732-16.101,33.049-39.026,45.525-68.14c3.182-7.424,6.158-15.248,8.939-23.408h32.692c55.807,0,101.209-45.402,101.209-101.209S466.597,23.815,410.791,23.815z M101.209,190.512c-36.11,0-65.488-29.378-65.488-65.488s29.378-65.488,65.488-65.488h6.173c1.118,47.317,6.676,91.933,16.182,130.977H101.209z M309.581,416.745v35.721H202.419v-35.721H309.581z M243.37,350.535c6.964-6.966,18.295-6.964,25.258,0c6.964,6.963,6.964,18.294,0,25.258c-6.964,6.964-18.294,6.964-25.258,0C236.406,368.829,236.406,357.499,243.37,350.535z M256,309.582c-63.003,0-109.401-104.1-112.903-250.046h225.807C365.401,205.482,319.003,309.582,256,309.582z M410.791,190.512h-22.353c9.504-39.044,15.062-83.66,16.182-130.977h6.171c36.11,0,65.488,29.378,65.488,65.488S446.901,190.512,410.791,190.512z"
          fill="currentColor"
        />
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
  const iconViewBox = icon === "reward" ? "0 0 512 512" : "0 0 20 20";

  return (
    <div className={classNames(styles.root, className)} {...props}>
      <div className={styles.iconWrap}>
        <Icon
          size={iconSize}
          viewBox={iconViewBox}
          aria-label={icon === "reward" ? "Reward icon" : "Wallet icon"}
          className={styles.icon}
        >
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
