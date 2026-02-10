import type { AnchorHTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Link.module.css";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  disabled?: boolean;
};

export function Link({ className, disabled, onClick, ...props }: LinkProps) {
  return (
    <a
      className={classNames(styles.link, disabled && styles.disabled, className)}
      aria-disabled={disabled}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
