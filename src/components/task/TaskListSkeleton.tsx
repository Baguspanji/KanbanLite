
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton() {
  return (
    <div className="space-y-3 mt-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-lg bg-card shadow-sm">
          <Skeleton className="h-5 w-5 flex-shrink-0" /> {/* Drag Handle */}
          
          <div className="flex-grow space-y-2 min-w-0">
            <Skeleton className="h-5 w-3/4" /> {/* Title */}
            <Skeleton className="h-4 w-full sm:w-5/6" /> {/* Description */}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-3">
            <Skeleton className="h-6 w-16 rounded-full" /> {/* Status Badge */}
            <Skeleton className="h-5 w-24" /> {/* Deadline */}
            <Skeleton className="h-5 w-28" /> {/* Created At */}
          </div>

          <div className="flex items-center gap-1 self-start sm:self-center sm:ml-auto">
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Comments Button */}
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Edit Button */}
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Delete Button */}
          </div>
        </div>
      ))}
    </div>
  );
}
