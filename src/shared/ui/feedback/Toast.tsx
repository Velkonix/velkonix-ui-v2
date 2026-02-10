import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Toast.module.css";

type ToastTone = "success" | "error" | "info";

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  tone?: ToastTone;
  title?: string;
};

export function Toast({ tone = "info", title, className, children, ...props }: ToastProps) {
  return (
    <div className={classNames(styles.toast, styles[tone], className)} {...props}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
