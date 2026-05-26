import type { HTMLAttributes } from "react";

import { useWallet } from "../../../app/providers/WalletProvider";
import { classNames } from "../utilities/classNames";
import { Button } from "../inputs/Button";
import styles from "./WalletMenu.module.css";

type WalletMenuProps = HTMLAttributes<HTMLDivElement> & {
  address?: string;
};

export function WalletMenu({ address, className, ...props }: WalletMenuProps) {
  const wallet = useWallet();
  const shownAddress = wallet.shortAddress ?? address ?? null;

  if (!shownAddress) {
    return null;
  }

  return (
    <div className={classNames(styles.menu, className)} data-testid="wallet-menu" {...props}>
      <span className={styles.address} data-testid="wallet-address">
        {shownAddress}
      </span>
      {wallet.isConnected && (
        <Button
          className={styles.disconnect}
          size="sm"
          variant="ghost"
          onClick={() => void wallet.disconnect()}
        >
          Disconnect
        </Button>
      )}
    </div>
  );
}
