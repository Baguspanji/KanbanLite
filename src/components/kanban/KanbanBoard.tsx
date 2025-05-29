
"use client";

import { useAppContext } from "@/context/AppContext";
import type { TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KanbanColumnSkeleton } from "./KanbanColumnSkeleton";

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByProjectId, isLoading } = useAppContext();
  const tasks = getTasksByProjectId(projectId);

  const tasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  if (isLoading) {
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
  );
}
