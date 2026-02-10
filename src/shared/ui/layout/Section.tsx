import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Section.module.css";

type SectionProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
};

export function Section({ title, description, className, children, ...props }: SectionProps) {
  return (
    <section className={classNames(styles.section, className)} {...props}>
      {(title || description) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
