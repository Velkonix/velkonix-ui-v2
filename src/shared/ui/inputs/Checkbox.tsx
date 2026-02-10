import type { InputHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Checkbox.module.css";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? `checkbox-${Math.random().toString(36).slice(2, 10)}`;

  return (
    <label className={classNames(styles.wrapper, className)} htmlFor={checkboxId}>
      <input id={checkboxId} type="checkbox" className={styles.input} {...props} />
      <span className={styles.box}>
        <span className={styles.check} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
