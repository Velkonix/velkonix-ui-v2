import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./ErrorState.module.css";

type ErrorStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: ReactNode;
};

export function ErrorState({ title, description, className, ...props }: ErrorStateProps) {
  return (
    <div className={classNames(styles.state, className)} {...props}>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}
