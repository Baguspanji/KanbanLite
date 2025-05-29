
"use client";

import { useAppContext } from "@/context/AppContext";
import type { Task } from "@/types";
import { TaskListItem } from "./TaskListItem";
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";

interface TaskListComponentProps {
  projectId: string;
}

export function TaskListComponent({ projectId }: TaskListComponentProps) {
  const { getTasksByProjectId, isLoading } = useAppContext();
  const tasks = getTasksByProjectId(projectId);

  // Sort tasks by creation date, newest first
  const sortedTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (isLoading) {
    // Skeleton handled by parent ProjectPage for now, or could use TaskListSkeleton here
    return <div>Loading tasks...</div>; 
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg shadow-sm bg-card">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground">This project doesn't have any tasks. Click "Add Task" to create one.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption className="py-4">A list of tasks for this project.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%] min-w-[200px]">Title</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[120px]">Deadline</TableHead>
            <TableHead className="min-w-[100px]">Created</TableHead>
            <TableHead className="text-right min-w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => (
            <TaskListItem key={task.id} task={task} projectId={projectId} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
