import * as React from "react";

import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-gray-200/80 dark:bg-gray-700/60",
          className,
        )}
        {...props}
      />
    );
  },
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
