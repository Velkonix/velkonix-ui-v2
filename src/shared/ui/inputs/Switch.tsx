import type { InputHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Switch.module.css";

type SwitchVariant = "default" | "collateral";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  variant?: SwitchVariant;
};

export function Switch({ label, className, id, variant = "default", ...props }: SwitchProps) {
  const switchId = id ?? `switch-${Math.random().toString(36).slice(2, 10)}`;

  return (
    <label
      className={classNames(styles.wrapper, variant === "collateral" ? styles.collateral : undefined, className)}
      htmlFor={switchId}
    >
      <input id={switchId} type="checkbox" className={styles.input} {...props} />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
