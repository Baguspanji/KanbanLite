
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, GripVertical, MessageSquare, MoreHorizontal } from "lucide-react";

export function TaskListSkeleton() {
  return (
    <div className="space-y-0 mt-2"> {/* Reduced space-y for tighter list look */}
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-3 px-2 border-b bg-card">
          {/* Drag Handle Skeleton */}
          <Skeleton className="h-5 w-5 flex-shrink-0" />
          
          {/* Main Content Skeleton */}
          <div className="flex-grow min-w-0 space-y-1.5">
            <Skeleton className="h-5 w-3/4 sm:w-1/2" /> {/* Title */}
            <Skeleton className="h-3.5 w-full sm:w-5/6" /> {/* Description line 1 */}
            <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-1.5" /> {/* Calendar Icon */}
                <Skeleton className="h-4 w-20" /> {/* Date */}
            </div>
          </div>
          
          {/* Right Aligned Info & Actions Skeleton */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto flex-shrink-0">
            <Skeleton className="h-6 w-16 rounded-full hidden sm:inline-flex" /> {/* Priority Badge Skeleton */}
            <div className="flex items-center gap-1.5">
                <Skeleton className="h-2 w-2 rounded-full" /> {/* Status Dot */}
                <Skeleton className="h-5 w-16 rounded-full" /> {/* Status Text Skeleton */}
            </div>
            <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-1" /> {/* Comment Icon */}
                <Skeleton className="h-4 w-4" /> {/* Comment Count */}
            </div>
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Ellipsis/Action Menu Skeleton */}
          </div>
        </div>
      ))}
    </div>
  );
}
