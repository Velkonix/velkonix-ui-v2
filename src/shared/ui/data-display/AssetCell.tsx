import type { HTMLAttributes } from "react";

import { getAssetIconBySymbol } from "../../lib/assetIcons";
import { classNames } from "../utilities/classNames";
import styles from "./AssetCell.module.css";

type AssetCellProps = HTMLAttributes<HTMLDivElement> & {
  symbol: string;
  name?: string;
  iconUrl?: string;
  variant?: "default" | "hero";
};

export function AssetCell({
  symbol,
  name,
  iconUrl,
  variant = "default",
  className,
  ...props
}: AssetCellProps) {
  const resolvedIconUrl = iconUrl ?? getAssetIconBySymbol(symbol);

  return (
    <div
      className={classNames(styles.cell, variant === "hero" && styles.hero, className)}
      {...props}
    >
      <span className={classNames(styles.icon, variant === "hero" && styles.heroIcon)}>
        {resolvedIconUrl ? <img src={resolvedIconUrl} alt={symbol} /> : symbol.slice(0, 1)}
      </span>
      <div>
        <div className={classNames(styles.symbol, variant === "hero" && styles.heroSymbol)}>
          {symbol}
        </div>
        {name && (
          <div className={classNames(styles.name, variant === "hero" && styles.heroName)}>
            {name}
          </div>
        )}
      </div>
    </div>
  );
}
