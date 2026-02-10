import type { ButtonHTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./IconButton.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={classNames(styles.button, className)}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}
