import type { ButtonHTMLAttributes } from "react";

import { useWallet } from "../../../app/providers/WalletProvider";
import { Button } from "../inputs/Button";
import styles from "./WalletConnectButton.module.css";

type WalletConnectButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function WalletConnectButton({
  className,
  onClick,
  disabled,
  ...props
}: WalletConnectButtonProps) {
  const wallet = useWallet();

  if (wallet.isConnected) {
    if (wallet.isWrongNetwork) {
      return (
        <Button
          className={`${styles.button} ${className ?? ""}`}
          variant="secondary"
          disabled={disabled || wallet.isConnecting}
          isLoading={wallet.isConnecting}
          onClick={async () => {
            await wallet.switchNetwork();
          }}
          {...props}
        >
          Switch Network
        </Button>
      );
    }

    return (
      <Button
        className={`${styles.button} ${className ?? ""}`}
        variant="secondary"
        disabled={disabled || wallet.isConnecting}
        isLoading={wallet.isConnecting}
        title={wallet.openAccountModal ? "Account" : "Disconnect wallet"}
        aria-label={`${wallet.shortAddress ?? "Wallet"} — account options`}
        onClick={async () => {
          if (wallet.openAccountModal) {
            wallet.openAccountModal();
            return;
          }
          await wallet.disconnect();
        }}
        {...props}
      >
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
        try {
          await wallet.connect();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Wallet connection failed", error);
        }
      }}
      {...props}
    >
      Connect Wallet
    </Button>
  );
}
