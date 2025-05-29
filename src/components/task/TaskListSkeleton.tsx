
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GripVertical } from "lucide-react";

export function TaskListSkeleton() {
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption className="py-4">Loading tasks...</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-px pr-0 pl-2"> {/* Drag handle column */}
              <GripVertical className="h-5 w-5 text-muted-foreground/50" />
            </TableHead>
            <TableHead className="w-[40%] min-w-[200px]">Title</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[120px]">Deadline</TableHead>
            <TableHead className="min-w-[100px]">Created</TableHead>
            <TableHead className="text-right min-w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell className="w-px pr-0 pl-3 py-3"> {/* Drag handle cell */}
                <Skeleton className="h-5 w-5" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-28" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
