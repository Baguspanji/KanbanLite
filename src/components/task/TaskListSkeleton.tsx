
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton() {
  return (
    <div className="space-y-3 mt-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card shadow-sm">
          <Skeleton className="h-5 w-5 flex-shrink-0 py-2 px-1" /> {/* Drag Handle */}
          
          <div className="flex-grow min-w-0 py-1 space-y-1.5">
            <Skeleton className="h-5 w-3/4 sm:w-1/2" /> {/* Title */}
            <Skeleton className="h-3 w-full sm:w-5/6" /> {/* Description line 1 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <Skeleton className="h-4 w-20" /> {/* Deadline */}
                <Skeleton className="h-4 w-24" /> {/* Created At */}
            </div>
          </div>
          
          <Skeleton className="h-6 w-20 rounded-full mx-2 sm:mx-4 flex-shrink-0" /> {/* Status Badge */}

          <div className="flex items-center gap-0.5 sm:gap-1 self-center ml-auto flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Comments Button */}
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Edit Button */}
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Delete Button */}
          </div>
        </div>
      ))}
    </div>
  );
}
