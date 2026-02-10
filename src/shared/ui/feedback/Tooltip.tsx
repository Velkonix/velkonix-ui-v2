import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Tooltip.module.css";

type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  content: ReactNode;
};

export function Tooltip({ content, children, className, ...props }: TooltipProps) {
  return (
    <span className={classNames(styles.wrapper, className)} {...props}>
      {children}
      <span className={styles.tooltip} role="tooltip">
        {content}
      </span>
    </span>
  );
}
