import type { HTMLAttributes, ReactNode } from "react";

import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./MetricText.module.css";

type MetricTextProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  iconAlt?: string;
};

export function MetricText({ title, value, icon, iconAlt, className, ...props }: MetricTextProps) {
  return (
    <div className={classNames(styles.root, icon && styles.rootWithIcon, className)} {...props}>
      {icon ? (
        <span className={styles.icon} aria-label={iconAlt} role={iconAlt ? "img" : undefined}>
          {icon}
        </span>
      ) : null}
      <div className={styles.content}>
        <Typography as="span" variant="caption" muted>
          {title}
        </Typography>
        <Typography as="span" variant="body" className={styles.value}>
          {value}
        </Typography>
      </div>
    </div>
  );
}
