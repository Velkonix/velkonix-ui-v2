import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./WalletMenu.module.css";

type WalletMenuProps = HTMLAttributes<HTMLDivElement> & {
  address: string;
};

export function WalletMenu({ address, className, ...props }: WalletMenuProps) {
  return (
    <div className={classNames(styles.menu, className)} {...props}>
      {address}
    </div>
  );
}
