import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./PageHeader.module.css";

type PageHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={classNames(styles.header, className)} {...props}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
