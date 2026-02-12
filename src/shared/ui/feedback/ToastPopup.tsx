import { useEffect, useRef } from "react";
import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import { Toast } from "./Toast";
import styles from "./ToastPopup.module.css";

type ToastTone = "success" | "error" | "info";

type ToastPopupProps = HTMLAttributes<HTMLDivElement> & {
  tone?: ToastTone;
  title?: string;
  durationMs?: number;
  onClose: () => void;
};

export function ToastPopup({
  tone = "info",
  title,
  durationMs = 5000,
  onClose,
  className,
  children,
  ...props
}: ToastPopupProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onCloseRef.current();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <div className={classNames(styles.container, className)} role="status" aria-live="polite" {...props}>
      <Toast tone={tone} title={title} className={styles.toast}>
        {children}
      </Toast>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close notification">
        ×
      </button>
      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} style={{ animationDuration: `${durationMs}ms` }} />
      </div>
    </div>
  );
}
