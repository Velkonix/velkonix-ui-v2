import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./ApyCell.module.css";

type ApyCellProps = HTMLAttributes<HTMLSpanElement>;

export function ApyCell({ className, ...props }: ApyCellProps) {
  return <span className={classNames(styles.apy, className)} {...props} />;
}
