
"use client";

import { useAppContext } from "@/context/AppContext";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KanbanColumnSkeleton } from "./KanbanColumnSkeleton";
import { DragDropContext, type OnDragEndResponder } from '@hello-pangea/dnd';
import { useState, useEffect } from "react";

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByProjectId, isLoading, moveTask } = useAppContext();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const tasks = getTasksByProjectId(projectId);

  const tasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) {
      return;
    }

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId as TaskStatus;

    if (TASK_STATUSES.includes(newStatus)) {
      moveTask(taskId, newStatus);
    } else {
      console.warn(`Invalid status drop target: ${newStatus}`);
    }
  };
  
  // Render skeletons if not mounted or if data is loading
  if (!hasMounted || isLoading) {
    return (
      <div className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-6 pb-4">
            {TASK_STATUSES.map((status) => (
              <div key={status} className="w-[320px] min-w-[300px] flex-shrink-0">
                <KanbanColumnSkeleton />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-6 pb-4">
            {TASK_STATUSES.map((status) => (
              <div key={status} className="w-[320px] min-w-[300px] flex-shrink-0">
                <KanbanColumn
                  title={status}
                  tasks={tasksByStatus(status)}
                  projectId={projectId}
                />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </DragDropContext>
  );
}
