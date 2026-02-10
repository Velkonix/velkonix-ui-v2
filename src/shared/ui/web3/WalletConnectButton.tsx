import type { ButtonHTMLAttributes } from "react";

import { Button } from "../inputs/Button";
import styles from "./WalletConnectButton.module.css";

type WalletConnectButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function WalletConnectButton({ className, ...props }: WalletConnectButtonProps) {
  return (
    <Button className={`${styles.button} ${className ?? ""}`} {...props}>
      Connect Wallet
    </Button>
  );
}
