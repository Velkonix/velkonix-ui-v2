import type { HTMLAttributes, ReactNode } from "react";

import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./PageHeader.module.css";

type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleAs?: "h1" | "h2";
  subtitleVariant?: "body" | "label";
};

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  titleAs = "h1",
  subtitleVariant = "body",
  ...props
}: PageHeaderProps) {
  const titleVariant = titleAs === "h2" ? "title" : "headline";

  return (
    <div className={classNames(styles.header, className)} {...props}>
      <div>
        <Typography as={titleAs} variant={titleVariant} className={styles.title}>
          {title}
        </Typography>
        {subtitle && (
          <Typography as="p" variant={subtitleVariant} muted className={styles.subtitle}>
            {subtitle}
          </Typography>
        )}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
