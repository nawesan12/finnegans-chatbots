"use client";
import React from "react";
import { motion } from "framer-motion";
import { itemVariants } from "@/lib/animations";

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change?: React.ReactNode;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}) => (
  <motion.div
    variants={itemVariants}
    className="bg-white p-6 rounded-lg shadow-md flex items-start justify-between"
  >
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      {change ? <p className="text-xs text-gray-400 mt-2">{change}</p> : null}
    </div>
    <div className="bg-indigo-100 p-3 rounded-full">
      <Icon className="h-6 w-6 text-indigo-600" />
    </div>
  </motion.div>
);

export default MetricCard;
