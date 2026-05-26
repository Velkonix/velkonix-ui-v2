import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Divider.module.css";

type DividerProps = HTMLAttributes<HTMLHRElement> & {
  tone?: "default" | "strong";
};

export function Divider({ tone = "default", className, ...props }: DividerProps) {
  return <hr className={classNames(styles.divider, styles[tone], className)} {...props} />;
}
