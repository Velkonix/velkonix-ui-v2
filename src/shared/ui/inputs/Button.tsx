import type { ButtonHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        styles.button,
        styles[variant],
        styles[size],
        isLoading && styles.loading,
        className
      )}
      disabled={disabled || isLoading}
      type={type}
      aria-busy={isLoading || undefined}
      {...props}
    >
      <span className={styles.content}>{children}</span>
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}
