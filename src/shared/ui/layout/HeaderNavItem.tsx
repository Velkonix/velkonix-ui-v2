import type { MouseEventHandler, ReactNode } from "react";

import { Link } from "../foundation/Link";
import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./HeaderNavItem.module.css";

type HeaderNavItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function HeaderNavItem({ href, label, icon, isActive = false, onClick }: HeaderNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={classNames(styles.item, isActive && styles.active)}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <Typography as="span" variant="label" className={styles.label}>
          {label}
        </Typography>
      </span>
      <span className={styles.spotlightLine} aria-hidden="true">
        <span className={styles.spotlightBeam} />
      </span>
    </Link>
  );
}
