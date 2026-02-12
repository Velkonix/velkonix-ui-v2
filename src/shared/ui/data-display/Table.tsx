import type { ReactNode } from "react";

import { classNames } from "../utilities/classNames";
import styles from "./Table.module.css";

type Column<Row> = {
  key: string;
  title: ReactNode;
  align?: "left" | "center" | "right";
  render?: (row: Row) => ReactNode;
};

type TableProps<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  className?: string;
  hideHeader?: boolean;
  borderless?: boolean;
};

export function Table<Row>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  className,
  hideHeader = false,
  borderless = false,
}: TableProps<Row>) {
  return (
    <div className={classNames(styles.wrapper, borderless && styles.borderless, className)}>
      <table className={styles.table}>
        {!hideHeader ? (
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={styles[column.align ?? "left"]}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={classNames(onRowClick && styles.clickable)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={styles[column.align ?? "left"]}>
                  {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
