import type { ReactNode } from "react";

import { Link } from "../foundation/Link";
import { ToastPopup } from "./ToastPopup";
import styles from "./TxToast.module.css";

type ToastTone = "success" | "error" | "info";

type TxToastProps = {
  tone: ToastTone;
  title: string;
  message?: ReactNode;
  txUrl?: string;
  onClose: () => void;
};

// Toast wrapper that appends an explorer link when a tx hash is present.
// Pending ("info") toasts stay longer so they survive until confirmation.
export function TxToast({ tone, title, message, txUrl, onClose }: TxToastProps) {
  return (
    <ToastPopup
      tone={tone}
      title={title}
      durationMs={tone === "info" ? 60000 : 5000}
      onClose={onClose}
    >
      {message}
      {txUrl ? (
        <span className={styles.linkRow}>
          <Link href={txUrl} target="_blank" rel="noreferrer">
            View on explorer ↗
          </Link>
        </span>
      ) : null}
    </ToastPopup>
  );
}
