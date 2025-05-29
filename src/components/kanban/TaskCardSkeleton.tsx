
"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskCardSkeleton() {
  return (
    <Card className="mb-4 shadow-md">
      <CardHeader className="pb-3 pt-4 px-4">
        <Skeleton className="h-5 w-full mb-1" /> {/* Title */}
        <Skeleton className="h-12 w-full" /> {/* Description */}
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <Skeleton className="h-4 w-1/2" /> {/* Deadline */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/4 rounded-full" /> {/* Status Badge */}
          <Skeleton className="h-5 w-10 rounded-full" /> {/* Comment Badge */}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 border-t px-4 py-3">
        <div className="w-full sm:flex-grow">
          <Skeleton className="h-8 w-full rounded-md" /> {/* Select */}
        </div>
        <div className="flex gap-1 self-end sm:self-center">
          <Skeleton className="h-7 w-7 rounded-md" /> {/* Comment Icon */}
          <Skeleton className="h-7 w-7 rounded-md" /> {/* Edit Icon */}
          <Skeleton className="h-7 w-7 rounded-md" /> {/* Delete Icon */}
        </div>
      </CardFooter>
    </Card>
  );
}
