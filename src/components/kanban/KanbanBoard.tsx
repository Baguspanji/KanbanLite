
"use client";

import { useAppContext } from "@/context/AppContext";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KanbanColumnSkeleton } from "./KanbanColumnSkeleton";
import { DragDropContext, type OnDragEndResponder, type DropResult } from '@hello-pangea/dnd';
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

  const onDragEnd: OnDragEndResponder = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    console.log('[KanbanBoard onDragEnd] Result:', result);

    // Dropped outside a valid droppable
    if (!destination) {
      console.log('[KanbanBoard onDragEnd] No destination. Drag aborted.');
      return;
    }

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('[KanbanBoard onDragEnd] Dropped in the same place. Drag aborted.');
      return;
    }

    const taskId = draggableId; // This should be task.id from TaskCard
    const newStatusCandidate = destination.droppableId; // This should be the status string of the target column

    console.log('[KanbanBoard onDragEnd] Details:', {
      taskId,
      sourceDroppableId: source.droppableId,
      destinationDroppableId: newStatusCandidate,
      destinationIndex: destination.index,
    });

    // Critical Check 1: Ensure taskId is not a status string
    if (TASK_STATUSES.includes(taskId as TaskStatus)) {
        console.error(`[KanbanBoard onDragEnd] CRITICAL ERROR: draggableId (taskId) is a status string: "${taskId}". This should be a task's unique ID. Aborting moveTask.`);
        return;
    }
    
    // Critical Check 2: Ensure newStatusCandidate is a string and a valid TaskStatus
    if (typeof newStatusCandidate === 'string' && TASK_STATUSES.includes(newStatusCandidate as TaskStatus)) {
      const finalNewStatus = newStatusCandidate as TaskStatus; // Cast is safe here due to includes check

      // This check should be redundant if TASK_STATUSES.includes was true and newStatusCandidate was a string,
      // but as a failsafe against unexpected 'undefined' string values or type coercion issues.
      if (finalNewStatus === undefined || finalNewStatus === null || String(finalNewStatus).trim() === "") {
          console.error(`[KanbanBoard onDragEnd] CRITICAL ERROR: finalNewStatus evaluated to undefined/null/empty after validation. Candidate was: "${newStatusCandidate}". Aborting moveTask.`);
          return;
      }

      console.log(`[KanbanBoard onDragEnd] Valid drop. Moving task "${taskId}" to status "${finalNewStatus}" for project "${projectId}".`);
      moveTask(projectId, taskId, finalNewStatus);
    } else {
      console.warn(`[KanbanBoard onDragEnd] Invalid status drop target: '${newStatusCandidate}' (type: ${typeof newStatusCandidate}). Task ID: "${taskId}". Aborting moveTask.`);
    }
  };
  
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
          <div className="flex gap-3 pb-4">
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
