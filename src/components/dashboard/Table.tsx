"use client";
import React from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Inbox } from "lucide-react";

type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
};

function Table<T extends { id: string | number }>({ columns, data }: TableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos</h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay datos para mostrar en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-gray-200"
        >
          {data.map((row) => (
            <motion.tr
              key={row.id}
              variants={itemVariants}
              className="hover:bg-gray-50"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key as keyof T] ?? null}
                </td>
              ))}
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}

export default Table;
