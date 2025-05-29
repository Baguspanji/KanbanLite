
"use client";

import type { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTaskDialog } from "@/components/kanban/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/kanban/DeleteTaskDialog";
import { TaskCommentsDialog } from "@/components/kanban/TaskCommentsDialog";
import { Edit3, Trash2, MessageSquare, CalendarDays, GripVertical } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Draggable } from 'react-beautiful-dnd';

interface TaskListItemProps {
  task: Task;
  projectId: string;
  index: number; // For react-beautiful-dnd
}

export function TaskListItem({ task, projectId, index }: TaskListItemProps) {
  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'To Do':
        return 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80';
      case 'On Dev':
        return 'bg-blue-500 text-white hover:bg-blue-500/90 dark:bg-blue-600 dark:hover:bg-blue-600/90';
      case 'On QA':
        return 'bg-yellow-500 text-white hover:bg-yellow-500/90 dark:bg-yellow-600 dark:hover:bg-yellow-600/90';
      case 'Done':
        return 'bg-green-500 text-white hover:bg-green-500/90 dark:bg-green-600 dark:hover:bg-green-600/90';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-500/90';
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 
            p-4 border rounded-lg shadow-sm bg-card
            hover:shadow-md transition-shadow duration-200
            ${snapshot.isDragging ? 'bg-primary/10 shadow-xl ring-2 ring-primary' : ''}
          `}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <div
            {...provided.dragHandleProps}
            className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground transition-colors self-start sm:self-center"
            aria-label="Drag task"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-grow space-y-1 min-w-0">
            <h3 className="font-medium break-words text-base">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 break-words" title={task.description}>
                {task.description}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-3 text-xs text-muted-foreground whitespace-nowrap">
            <Badge className={`${getStatusBadgeClass(task.status)} text-xs px-2 py-0.5 h-6`}>
              {task.status}
            </Badge>

            {task.deadline && (
              <div className="flex items-center">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                {format(parseISO(task.deadline), "MMM d, yyyy")}
              </div>
            )}

            <div className="flex items-center" title={`Created ${format(parseISO(task.createdAt), "PPpp")}`}>
              Created: {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true })}
            </div>
          </div>

          <div className="flex items-center gap-1 self-start sm:self-center sm:ml-auto pt-2 sm:pt-0">
            <TaskCommentsDialog
              task={task}
              triggerButton={
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                  <MessageSquare className="h-4 w-4" />
                  {task.comments && task.comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 transform translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {task.comments.length}
                    </span>
                  )}
                  <span className="sr-only">View Comments</span>
                </Button>
              }
            />
            <CreateTaskDialog
              projectId={projectId}
              task={task}
              triggerButton={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit3 className="h-4 w-4" />
                  <span className="sr-only">Edit Task</span>
                </Button>
              }
            />
            <DeleteTaskDialog 
              task={task} 
            /> 
          </div>
        </div>
      )}
    </Draggable>
  );
}
