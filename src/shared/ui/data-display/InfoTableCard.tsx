import type { ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import { Card } from "./Card";
import { PanelHeader } from "./PanelHeader";
import { Table } from "./Table";
import { ValueCell } from "./ValueCell";
import styles from "./InfoTableCard.module.css";

export type InfoTableRow = {
  metric: ReactNode;
  value: ReactNode;
};

type InfoTableCardProps = {
  rows: InfoTableRow[];
  getRowKey: (row: InfoTableRow) => string;
  title?: ReactNode;
  className?: string;
};

export function InfoTableCard({ rows, getRowKey, title, className }: InfoTableCardProps) {
  return (
    <Card className={classNames(styles.card, className)}>
      {title ? <PanelHeader title={title} className={styles.header} /> : null}
      <Table
        className={styles.table}
        hideHeader
        borderless
        columns={[
          { key: "metric", title: "Metric" },
          {
            key: "value",
            title: "Value",
            align: "right",
            render: (row) => <ValueCell>{row.value}</ValueCell>,
          },
        ]}
        rows={rows}
        getRowKey={getRowKey}
      />
    </Card>
  );
}
