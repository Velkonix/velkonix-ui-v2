import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function Card({ title, subtitle, actions, className, children, ...props }: CardProps) {
  return (
    <section className={classNames(styles.card, className)} {...props}>
      {(title || subtitle || actions) && (
        <header className={styles.header}>
          <div>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
