import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./NavMenu.module.css";

type NavMenuProps = HTMLAttributes<HTMLDivElement> & {
  items: string[];
  active?: string;
};

export function NavMenu({ items, active, className, ...props }: NavMenuProps) {
  return (
    <div className={classNames(styles.menu, className)} {...props}>
      {items.map((item) => (
        <span key={item} className={classNames(styles.item, item === active && styles.active)}>
          {item}
        </span>
      ))}
    </div>
  );
}
