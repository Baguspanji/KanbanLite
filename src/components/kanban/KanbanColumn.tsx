
"use client";

import type { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";
// CreateTaskDialog import is removed as it's no longer used here
import { ScrollArea } from "@/components/ui/scroll-area";
// PlusCircle import is removed
// Button import is removed

interface KanbanColumnProps {
  title: TaskStatus;
  tasks: Task[];
  projectId: string;
}

export function KanbanColumn({ title, tasks, projectId }: KanbanColumnProps) {
  const columnBackgroundColor = () => {
    switch (title) {
      case 'To Do': return 'bg-muted/30';
      case 'On Dev': return 'bg-blue-100/50 dark:bg-blue-900/30';
      case 'On QA': return 'bg-yellow-100/50 dark:bg-yellow-900/30';
      case 'Done': return 'bg-green-100/50 dark:bg-green-900/30';
      default: return 'bg-muted/30';
    }
  };
  
  return (
    <div className={`flex flex-col rounded-lg shadow-sm border min-h-[300px] h-full ${columnBackgroundColor()}`}>
      <div className="p-4 border-b sticky top-0 bg-inherit rounded-t-lg z-10">
        <div className="flex justify-between items-center"> {/* Removed mb-1 from here */}
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
           <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
         {/* CreateTaskDialog and its trigger button for adding task directly to column are removed */}
      </div>
      <ScrollArea className="flex-grow p-4 pt-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center pt-10">No tasks yet.</p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} projectId={projectId} />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
