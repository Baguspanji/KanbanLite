
"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectItemSkeleton() {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-10 w-full" />
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
          </div>
          <Skeleton className="h-2 w-full mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-4 w-1/3 pt-2" />
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4">
        <Skeleton className="h-9 w-28" /> {/* Open Board Button */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" /> {/* Edit Icon Button */}
          <Skeleton className="h-9 w-9 rounded-md" /> {/* Delete Icon Button */}
        </div>
      </CardFooter>
    </Card>
  );
}
