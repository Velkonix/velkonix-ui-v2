import type { HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./TxStatus.module.css";

type TxStatusType = "pending" | "success" | "failed";

type TxStatusProps = HTMLAttributes<HTMLDivElement> & {
  status: TxStatusType;
};

export function TxStatus({ status, className, ...props }: TxStatusProps) {
  return (
    <div className={classNames(styles.status, styles[status], className)} {...props}>
      {status}
    </div>
  );
}
