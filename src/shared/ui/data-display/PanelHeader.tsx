import type { HTMLAttributes, ReactNode } from "react";

import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./PanelHeader.module.css";

type PanelHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  details?: ReactNode;
};

type PanelHeaderStatProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
};

export function PanelHeader({ title, details, className, ...props }: PanelHeaderProps) {
  return (
    <div className={classNames(styles.header, className)} {...props}>
      <Typography as="p" variant="label" className={styles.title}>
        {title}
      </Typography>
      {details ? <div className={styles.details}>{details}</div> : null}
    </div>
  );
}

export function PanelHeaderStat({ label, value, className, ...props }: PanelHeaderStatProps) {
  return (
    <div className={classNames(styles.stat, className)} {...props}>
      <Typography as="span" variant="caption" muted>
        {label}
      </Typography>
      <Typography as="span">{value}</Typography>
    </div>
  );
}
