import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./PageContainer.module.css";

type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={classNames(styles.container, className)} {...props} />;
}
