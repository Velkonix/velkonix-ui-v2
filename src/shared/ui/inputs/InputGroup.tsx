import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./InputGroup.module.css";

type InputGroupProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function InputGroup({
  label,
  hint,
  error,
  prefix,
  suffix,
  className,
  children,
  ...props
}: InputGroupProps) {
  return (
    <div className={classNames(styles.wrapper, className)} {...props}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={classNames(styles.control, error && styles.error)}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <div className={styles.content}>{children}</div>
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}
