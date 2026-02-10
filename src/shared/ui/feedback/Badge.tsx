import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Badge.module.css";

type BadgeTone = "neutral" | "success" | "warning" | "error";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span className={classNames(styles.badge, styles[tone], className)} {...props} />
  );
}
