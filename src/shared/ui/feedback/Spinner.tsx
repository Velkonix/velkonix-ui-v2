import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Spinner.module.css";

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return <span className={classNames(styles.spinner, styles[size], className)} {...props} />;
}
