
"use client";

import type { Task, TaskStatus, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTaskDialog } from "@/components/kanban/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/kanban/DeleteTaskDialog";
import { TaskCommentsDialog } from "@/components/kanban/TaskCommentsDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit3, MessageSquare, CalendarDays, GripVertical, MoreVertical, MessageCircle, Trash2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { Draggable } from '@hello-pangea/dnd';
import { useState } from "react";

interface TaskListItemProps {
  task: Task;
  projectId: string; 
  index: number;
}

export function TaskListItem({ task, projectId, index }: TaskListItemProps) {
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

  const getStatusBadgeStyle = (status: TaskStatus): {dot: string, badge: string} => {
    switch (status) {
      case 'To Do':
        return { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' };
      case 'On Dev':
        return { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' };
      case 'On QA':
        return { dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' };
      case 'Done':
        return { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700' };
      default:
        return { dot: 'bg-gray-400', badge: 'bg-muted text-muted-foreground border-transparent' };
    }
  };
  const statusStyle = getStatusBadgeStyle(task.status);

  return (
    <Draggable
      draggableId={`task-${task.id}-item`}
      index={index}
      disableInteractiveElementBlocking={true}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            flex items-center gap-3 py-3 px-2 border-b
            bg-card transition-shadow duration-200
            ${snapshot.isDragging ? 'shadow-xl ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/50'}
          `}
          style={{ ...provided.draggableProps.style }}
        >
          {/* Drag Handle */}
          <div
            {...provided.dragHandleProps}
            className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground transition-colors self-center py-2 px-1"
            aria-label="Drag task"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Main Content Area */}
          <div className="flex-grow min-w-0 space-y-0.5">
            <h3 className="font-medium break-words text-sm">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 break-words" title={task.description}>
                {task.description}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <div className="flex items-center">
                <CalendarDays className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                <span className="mr-1">Created:</span>
                {task.createdAt ? format(parseISO(task.createdAt), "dd MMM yy") : 'N/A'}
              </div>
              {task.deadline && ( 
                <div className="flex items-center">
                  <CalendarDays className="h-3.5 w-3.5 mr-1 flex-shrink-0 text-destructive" />
                  <span className="mr-1">Deadline:</span>
                  {format(parseISO(task.deadline), "dd MMM yy")}
                </div>
              )}
            </div>
          </div>

          {/* Right Aligned Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Dialogs for actions */}
            <CreateTaskDialog
              projectId={projectId}
              task={task}
              open={isCreateTaskOpen}
              onOpenChange={setIsCreateTaskOpen}
              triggerButton={<span />} 
            />
            <DeleteTaskDialog
              task={task}
              open={isDeleteTaskOpen}
              onOpenChange={setIsDeleteTaskOpen}
              triggerButton={<span />} 
            />
            <TaskCommentsDialog
              task={task}
              open={isCommentsOpen}
              onOpenChange={setIsCommentsOpen}
              triggerButton={<span />} 
            />

            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center text-xs text-muted-foreground" title={`${task.comments.length} comment(s)`}>
                <MessageSquare className="h-4 w-4 mr-0.5 sm:mr-1" />
                {task.comments.length}
              </div>
            )}

            {task.priority && (
              <Badge variant="outline" className={`text-xs px-2 py-0.5 h-6 hidden sm:inline-flex ${getPriorityBadgeClass(task.priority)}`}>
                {task.priority}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs px-2 py-0.5 h-6 flex items-center gap-1.5 ${statusStyle.badge} rounded-md`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}></span>
              {task.status}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </div>
      )}
    </Draggable>
  );
}
