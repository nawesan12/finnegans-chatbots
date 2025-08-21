"use client";
import React from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";

const Table = ({ columns, data }) => (
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
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </motion.tr>
        ))}
      </motion.tbody>
    </table>
  </div>
);

export default Table;
