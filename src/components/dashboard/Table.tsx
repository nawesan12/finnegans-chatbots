"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

import { containerVariants, itemVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Alignment = "left" | "center" | "right";

type TableColumn<T> = {
  key: keyof T | string;
  label: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: Alignment;
};

type TableEmptyState = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type MotionTableRowProps = React.ComponentPropsWithoutRef<typeof motion.tr>;

type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  emptyState?: TableEmptyState;
  getRowKey?: (row: T, index: number) => string | number;
  className?: string;
  getRowProps?: (row: T, index: number) => MotionTableRowProps;
};

const alignmentClassNames: Record<Alignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function Table<T extends Record<PropertyKey, unknown>>({
  columns,
  data,
  emptyState,
  getRowKey,
  className,
  getRowProps,
}: TableProps<T>) {
  if (!data || data.length === 0) {
    const EmptyIcon = emptyState?.icon ?? Inbox;
    return (
      <div className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}>
        <EmptyIcon className="h-12 w-12 text-gray-300" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {emptyState?.title ?? "Sin datos"}
          </h3>
          <p className="text-sm text-gray-500">
            {emptyState?.description ?? "No hay información para mostrar en este momento."}
          </p>
        </div>
        {emptyState?.action ? (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {emptyState.action}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => {
              const alignment = alignmentClassNames[column.align ?? "left"];
              return (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500",
                    alignment,
                    column.headerClassName,
                  )}
                >
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <motion.tbody
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-gray-200"
        >
          {data.map((row, index) => {
            const rowKey = getRowKey?.(row, index) ??
              ((row as { id?: string | number }).id ?? index);
            const providedRowProps =
              (getRowProps?.(row, index) ?? {}) as MotionTableRowProps;
            const { className: providedClassName, ...restRowProps } =
              providedRowProps;
            return (
              <motion.tr
                key={String(rowKey)}
                variants={itemVariants}
                className={cn("hover:bg-gray-50", providedClassName)}
                {...restRowProps}
              >
                {columns.map((column) => {
                  const alignment = alignmentClassNames[column.align ?? "left"];
                  const cellValue = column.render
                    ? column.render(row)
                    : (row as Record<PropertyKey, React.ReactNode>)[
                        column.key as PropertyKey
                      ] ?? null;
                  return (
                    <td
                      key={`${String(rowKey)}-${String(column.key)}`}
                      className={cn(
                        "whitespace-nowrap px-6 py-4 text-sm text-gray-700",
                        alignment,
                        column.className,
                      )}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </motion.tr>
            );
          })}
        </motion.tbody>
      </table>
    </div>
  );
}

export type { TableColumn, TableProps };
export default Table;
