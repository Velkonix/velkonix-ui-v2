import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./EmptyState.module.css";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: ReactNode;
};

export function EmptyState({ title, description, className, ...props }: EmptyStateProps) {
  return (
    <div className={classNames(styles.state, className)} {...props}>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}
