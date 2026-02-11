import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { classNames } from "../utilities/classNames";
import styles from "./Header.module.css";

type HeaderProps = HTMLAttributes<HTMLElement> & {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
};

export function Header({ logo, nav, actions, className, ...props }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const hasNavigation = Boolean(nav);
  const hasActions = Boolean(actions);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      mobileMenuButtonRef.current?.focus();
      return;
    }

    const drawerElement = mobileDrawerRef.current;
    if (!drawerElement) {
      return;
    }

    const interactiveElement = drawerElement.querySelector<HTMLElement>(
      "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    (interactiveElement ?? drawerElement).focus();
  }, [isMobileMenuOpen]);

  const closeOnInteractiveTarget = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.closest("a,button,[role='menuitem'],[role='link']")) {
      setIsMobileMenuOpen(false);
    }
  };

  const mobileOverlay = hasNavigation ? (
    <div
      id={mobileMenuId}
      className={classNames(styles.mobileDrawerOverlay, isMobileMenuOpen && styles.mobileDrawerOverlayOpen)}
      aria-hidden={!isMobileMenuOpen}
      onMouseDown={() => setIsMobileMenuOpen(false)}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <div
        className={styles.mobileDrawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        ref={mobileDrawerRef}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <nav className={styles.mobileDrawerNav} aria-label="Mobile primary" onClickCapture={closeOnInteractiveTarget}>
          {nav}
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <header className={classNames(styles.header, className)} {...props}>
      <div className={styles.logo}>{logo}</div>
      <nav className={styles.nav} aria-label="Primary">
        {nav}
      </nav>
      <div className={styles.actions}>{actions}</div>
      {hasNavigation || hasActions ? (
        <div className={styles.mobileControls}>
          {hasActions ? <div className={styles.mobileActions}>{actions}</div> : null}
          {hasNavigation ? (
            <button
              type="button"
              ref={mobileMenuButtonRef}
              className={styles.mobileMenuButton}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-controls={mobileMenuId}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            >
              <span className={styles.mobileMenuIcon} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {typeof document !== "undefined" && mobileOverlay ? createPortal(mobileOverlay, document.body) : null}
    </header>
  );
}
