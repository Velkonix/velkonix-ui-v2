import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./ValueCell.module.css";

type ValueCellProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "muted";
};

export function ValueCell({ tone = "default", className, ...props }: ValueCellProps) {
  return <span className={classNames(styles.value, styles[tone], className)} {...props} />;
}
