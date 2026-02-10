import type { ButtonHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./BackButton.module.css";

type BackButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function BackButton({ className, children = "Back", ...props }: BackButtonProps) {
  return (
    <button type="button" className={classNames(styles.button, className)} {...props}>
      ← {children}
    </button>
  );
}
