import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Header.module.css";

type HeaderProps = HTMLAttributes<HTMLElement> & {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
};

export function Header({ logo, nav, actions, className, ...props }: HeaderProps) {
  return (
    <header className={classNames(styles.header, className)} {...props}>
      <div className={styles.logo}>{logo}</div>
      <nav className={styles.nav}>{nav}</nav>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
