import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { classNames } from "../utilities/classNames";
import styles from "./Modal.module.css";

type ModalProps = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={classNames(styles.modal, styles[size])}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Dialog"}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          <button
            className={styles.close}
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
