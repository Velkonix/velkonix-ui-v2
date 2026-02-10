import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Skeleton.module.css";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: string | number;
  height?: string | number;
};

export function Skeleton({ width = "100%", height = 16, className, ...props }: SkeletonProps) {
  return (
    <div
      className={classNames(styles.skeleton, className)}
      style={{ width, height }}
      {...props}
    />
  );
}
