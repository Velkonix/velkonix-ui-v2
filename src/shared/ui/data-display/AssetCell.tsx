import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./AssetCell.module.css";

type AssetCellProps = HTMLAttributes<HTMLDivElement> & {
  symbol: string;
  name?: string;
  iconUrl?: string;
};

export function AssetCell({ symbol, name, iconUrl, className, ...props }: AssetCellProps) {
  return (
    <div className={classNames(styles.cell, className)} {...props}>
      <span className={styles.icon}>
        {iconUrl ? <img src={iconUrl} alt={symbol} /> : symbol.slice(0, 1)}
      </span>
      <div>
        <div className={styles.symbol}>{symbol}</div>
        {name && <div className={styles.name}>{name}</div>}
      </div>
    </div>
  );
}
