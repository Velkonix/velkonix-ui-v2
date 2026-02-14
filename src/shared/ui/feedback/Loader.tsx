import type { HTMLAttributes, ReactNode } from "react";

import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import { Spinner } from "./Spinner";
import styles from "./Loader.module.css";

type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
};

export function Loader({
  label = "Loading data...",
  size = "lg",
  fullPage = false,
  className,
  ...props
}: LoaderProps) {
  return (
    <div
      className={classNames(styles.loader, styles[size], fullPage && styles.fullPage, className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <Spinner size={size} className={styles.spinner} aria-hidden="true" />
      {label ? (
        <Typography as="span" variant="label" muted className={styles.label}>
          {label}
        </Typography>
      ) : null}
    </div>
  );
}
