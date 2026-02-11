import type { ButtonHTMLAttributes } from "react";

import { useWallet } from "../../../app/providers/WalletProvider";
import { Button } from "../inputs/Button";
import styles from "./WalletConnectButton.module.css";

type WalletConnectButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function WalletConnectButton({ className, onClick, disabled, ...props }: WalletConnectButtonProps) {
  const wallet = useWallet();

  if (wallet.isConnected) {
    return (
      <Button className={`${styles.button} ${className ?? ""}`} variant="secondary" disabled {...props}>
        {wallet.shortAddress ?? wallet.address ?? "Wallet connected"}
      </Button>
    );
  }

  return (
    <Button
      className={`${styles.button} ${className ?? ""}`}
      disabled={disabled || wallet.isConnecting}
      isLoading={wallet.isConnecting}
      onClick={async (event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        await wallet.connect();
      }}
      {...props}
    >
      Connect Wallet
    </Button>
  );
}
