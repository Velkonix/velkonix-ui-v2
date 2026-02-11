import type { ElementType, HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Typography.module.css";

type TypographyVariant = "body" | "caption" | "microcaption" | "label" | "title" | "headline";

type TypographyProps<T extends ElementType> = {
  as?: T;
  variant?: TypographyVariant;
  muted?: boolean;
  align?: "left" | "center" | "right";
} & HTMLAttributes<HTMLElement>;

export function Typography<T extends ElementType = "p">({
  as,
  variant = "body",
  muted = false,
  align = "left",
  className,
  ...props
}: TypographyProps<T>) {
  const Component = (as ?? "p") as ElementType;

  return (
    <Component
      className={classNames(
        styles.base,
        styles[variant],
        styles[align],
        muted && styles.muted,
        className
      )}
      {...props}
    />
  );
}
