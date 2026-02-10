import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Footer.module.css";

type FooterProps = HTMLAttributes<HTMLElement> & {
  links?: ReactNode;
  label?: ReactNode;
};

export function Footer({ links, label, className, ...props }: FooterProps) {
  return (
    <footer className={classNames(styles.footer, className)} {...props}>
      <div className={styles.links}>{links}</div>
      {label && <div className={styles.label}>{label}</div>}
    </footer>
  );
}
