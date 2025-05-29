
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCardSkeleton } from "./TaskCardSkeleton";

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col rounded-lg shadow-sm border min-h-[300px] h-full bg-muted/30">
      <div className="p-4 border-b sticky top-0 bg-inherit rounded-t-lg z-10">
        <div className="flex justify-between items-center mb-1">
          <Skeleton className="h-6 w-1/2" /> {/* Title */}
          <Skeleton className="h-5 w-8 rounded-full" /> {/* Task Count */}
        </div>
        <Skeleton className="h-8 w-full rounded-md" /> {/* Add new task button */}
      </div>
      <ScrollArea className="flex-grow p-4 pt-2">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </ScrollArea>
    </div>
  );
}
