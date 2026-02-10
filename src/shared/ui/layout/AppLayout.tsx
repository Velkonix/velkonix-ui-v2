import type { ReactNode } from "react";

import styles from "./AppLayout.module.css";

type AppLayoutProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AppLayout({ header, footer, children }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      {header}
      <main className={styles.main}>{children}</main>
      {footer}
    </div>
  );
}
