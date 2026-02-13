import type { HTMLAttributes, ReactNode } from "react";

import { Typography } from "../foundation/Typography";
import { classNames } from "../utilities/classNames";
import styles from "./MetricTile.module.css";

type MetricTileTone = "default" | "subtle";

type MetricTileProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  value: ReactNode;
  actions?: ReactNode;
  media?: ReactNode;
  mediaAlt?: string;
  tone?: MetricTileTone;
};

export function MetricTile({
  title,
  value,
  actions,
  media,
  mediaAlt,
  tone = "default",
  className,
  ...props
}: MetricTileProps) {
  return (
    <div
      className={classNames(
        styles.root,
        actions ? styles.rootWithActions : undefined,
        tone === "subtle" ? styles.toneSubtle : undefined,
        className
      )}
      data-tone={tone}
      {...props}
    >
      <div
        className={classNames(styles.media, media ? styles.mediaWithContent : undefined)}
        aria-label={mediaAlt}
        role={mediaAlt ? "img" : undefined}
      >
        {media ?? <span className={styles.mediaFallback} aria-hidden="true" />}
      </div>
      <div className={styles.content}>
        <Typography as="span" variant="caption" muted>
          {title}
        </Typography>
        <Typography as="p" variant="body" className={styles.value}>
          {value}
        </Typography>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
