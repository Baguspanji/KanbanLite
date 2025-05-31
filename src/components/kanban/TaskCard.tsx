
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Task, TaskPriority } from "@/types";
import { CalendarDays, MessageSquare, GripVertical, MoreVertical, Edit3, Trash2, MessageCircle } from "lucide-react";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { format, parseISO } from 'date-fns';
import { Draggable } from '@hello-pangea/dnd';
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  projectId: string;
  index: number;
}

export function TaskCard({ task, projectId, index }: TaskCardProps) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  
  const getPriorityBadgeClass = (priority?: TaskPriority) => {
    switch (priority) {
      case 'Low':
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      case 'High':
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={false}
    >
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`w-full min-w-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-card ${snapshot.isDragging ? 'shadow-lg scale-105 opacity-95 ring-1 ring-primary' : ''}`}
          style={{ ...provided.draggableProps.style }}
        >
          <div className="flex items-start p-3">
            <div {...provided.dragHandleProps} className="cursor-grab pt-0.5 pr-2 text-muted-foreground hover:text-foreground flex-shrink-0">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-grow min-w-0 space-y-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                        <CardTitle className="text-sm font-semibold leading-tight break-words w-full min-w-0">
                            {task.title}
                        </CardTitle>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-1.5 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Task actions</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsCommentsOpen(true)}>
                            <MessageCircle className="mr-2 h-4 w-4" /> View Comments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsCreateTaskOpen(true)}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsDeleteTaskOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              {task.description && (
                <CardDescription className="max-w-60 text-xs h-10 overflow-hidden text-ellipsis pr-1" title={task.description}>
                  {task.description}
                </CardDescription>
              )}
            </div>
          </div>

          {(task.deadline || task.comments?.length || task.priority) && (
            <CardFooter className="px-3 pb-3 pt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <div className="flex items-center gap-3">
                {task.deadline && (
                  <div className="flex items-center text-xs text-destructive">
                    <CalendarDays className="h-3 w-3.5 mr-1 flex-shrink-0" />
                    {format(parseISO(task.deadline), "dd MMM")}
                  </div>
                )}
                {task.comments && task.comments.length > 0 && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3.5 mr-1 flex-shrink-0" />
                    {task.comments.length}
                  </div>
                )}
              </div>
              {task.priority && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0.5 h-5 ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </Badge>
              )}
            </CardFooter>
          )}

          {/* Dialogs for actions */}
          <CreateTaskDialog
            projectId={projectId}
            task={task}
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            triggerButton={<span />} // Hidden trigger, dialog controlled by state
          />
          <DeleteTaskDialog
            task={task}
            open={isDeleteTaskOpen}
            onOpenChange={setIsDeleteTaskOpen}
            triggerButton={<span />} // Hidden trigger
          />
          <TaskCommentsDialog
            task={task}
            open={isCommentsOpen}
            onOpenChange={setIsCommentsOpen}
            triggerButton={<span />} // Hidden trigger
          />
        </Card>
      )}
    </Draggable>
  );
}

