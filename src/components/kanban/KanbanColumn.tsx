
"use client";

import type { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Droppable } from '@hello-pangea/dnd';
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  title: TaskStatus;
  tasks: Task[];
  projectId: string;
}

export function KanbanColumn({ title, tasks, projectId }: KanbanColumnProps) {
  
  const getStatusIndicatorColor = (status: TaskStatus) => {
    switch (status) {
      case 'To Do': return 'bg-yellow-400';
      case 'On Dev': return 'bg-blue-400';
      case 'On QA': return 'bg-orange-400'; // Assuming orange for On QA
      case 'Done': return 'bg-pink-500'; // Or purple, adjust as needed
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col rounded-lg shadow-sm border bg-muted/20 dark:bg-background h-full">
      <div className="p-4 border-b sticky top-0 bg-inherit rounded-t-lg z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusIndicatorColor(title)}`}></span>
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold px-2 py-1 text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <Droppable 
        droppableId={title} 
        type="TASK" 
        isDropDisabled={false} 
        isCombineEnabled={false}
        ignoreContainerClipping={false} 
      >
        {(provided, snapshot) => (
          <ScrollArea 
            className={`flex-grow p-3 pt-2 transition-colors duration-200 ease-in-out ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
          >
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="min-h-[150px] space-y-3" // Added space-y-3 for gap between cards
            >
              {tasks.length === 0 ? (
                !snapshot.isDraggingOver && <p className="text-xs text-muted-foreground text-center pt-10">No tasks in this stage.</p>
              ) : (
                tasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} projectId={projectId} index={index} />
                ))
              )}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
