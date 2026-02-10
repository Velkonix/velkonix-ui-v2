import type { SVGAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Icon.module.css";

type IconProps = SVGAttributes<SVGSVGElement> & {
  size?: number;
};

export function Icon({ size = 20, className, children, ...props }: IconProps) {
  return (
    <svg
      className={classNames(styles.icon, className)}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}
