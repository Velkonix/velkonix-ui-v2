import type { InputHTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Input.module.css";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function Input({ label, hint, error, prefix, suffix, className, id, ...props }: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 10)}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={classNames(styles.wrapper, className)}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={classNames(styles.control, error && styles.error)}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className={styles.errorText}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
