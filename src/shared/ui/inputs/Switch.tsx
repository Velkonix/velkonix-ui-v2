import type { InputHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Switch.module.css";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export function Switch({ label, className, id, ...props }: SwitchProps) {
  const switchId = id ?? `switch-${Math.random().toString(36).slice(2, 10)}`;

  return (
    <label className={classNames(styles.wrapper, className)} htmlFor={switchId}>
      <input id={switchId} type="checkbox" className={styles.input} {...props} />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
