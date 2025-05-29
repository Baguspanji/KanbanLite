
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
import { TaskListSkeleton } from "./TaskListSkeleton";
import { DragDropContext, Droppable, type OnDragEndResponder } from 'react-beautiful-dnd';
import { useEffect, useState } from "react";

interface TaskListComponentProps {
  projectId: string;
}

export function TaskListComponent({ projectId }: TaskListComponentProps) {
  const { getTasksByProjectId, isLoading, reorderTasksInList } = useAppContext();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const tasks = getTasksByProjectId(projectId);

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;

    if (!destination) {
      return; // Dropped outside a valid droppable
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return; // Dropped in the same place
    }

    // Call the reorder function from context
    reorderTasksInList(projectId, source.index, destination.index);
  };

  if (!hasMounted || isLoading) {
    return <TaskListSkeleton />;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg shadow-sm bg-card">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground">This project doesn't have any tasks. Click "Add Task" to create one.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
        <Table>
          <TableCaption className="py-4">A list of tasks for this project. Drag to reorder.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-px pr-0 pl-2"></TableHead> {/* Drag handle column */}
              <TableHead className="w-[40%] min-w-[200px]">Title</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Deadline</TableHead>
              <TableHead className="min-w-[100px]">Created</TableHead>
              <TableHead className="text-right min-w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <Droppable droppableId={`project-${projectId}-tasks`} type="TASK_LIST_ITEM">
            {(provided) => (
              <TableBody
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {tasks.map((task, index) => (
                  <TaskListItem key={task.id} task={task} projectId={projectId} index={index} />
                ))}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </div>
    </DragDropContext>
  );
}
