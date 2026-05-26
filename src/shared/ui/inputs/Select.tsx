import type { SelectHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Select.module.css";

type Option = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: Option[];
};

export function Select({
  label,
  hint,
  error,
  options,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? `select-${Math.random().toString(36).slice(2, 10)}`;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={classNames(styles.wrapper, className)}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className={classNames(styles.control, error && styles.error)}>
        <select
          id={selectId}
          className={styles.select}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
      </div>
      {error ? (
        <span id={`${selectId}-error`} className={styles.errorText}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${selectId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
