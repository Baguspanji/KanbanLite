
"use client";

import type { Task, TaskStatus, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTaskDialog } from "@/components/kanban/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/kanban/DeleteTaskDialog";
import { TaskCommentsDialog } from "@/components/kanban/TaskCommentsDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit3, MessageSquare, CalendarDays, GripVertical, MoreHorizontal, Trash2, MessageCircle } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { Draggable } from '@hello-pangea/dnd';
import { useState } from "react";

interface TaskListItemProps {
  task: Task;
  index: number;
}

export function TaskListItem({ task, index }: TaskListItemProps) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const getPriorityBadgeClass = (priority?: TaskPriority) => {
    switch (priority) {
      case 'Low':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
      case 'High':
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  const getStatusBadgeStyle = (status: TaskStatus): {dot: string, badge: string} => {
    switch (status) {
      case 'To Do':
        return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' };
      case 'On Dev':
        return { dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700' };
      case 'On QA':
        return { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700' };
      case 'Done':
        return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' };
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
          <div className="flex-grow min-w-0 space-y-1">
            <h3 className="font-medium break-words text-sm">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 break-words" title={task.description}>
                {task.description}
              </p>
            )}
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              {format(parseISO(task.createdAt), "dd MMM yyyy")}
            </div>
          </div>

          {/* Right Aligned Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto flex-shrink-0">
            {task.priority && (
              <Badge variant="outline" className={`text-xs px-2 py-0.5 h-6 hidden sm:inline-flex ${getPriorityBadgeClass(task.priority)}`}>
                {task.priority}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs px-2 py-0.5 h-6 flex items-center gap-1.5 ${statusStyle.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}></span>
              {task.status}
            </Badge>
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MessageSquare className="h-4 w-4 mr-1" />
                {task.comments.length}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
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

          {/* Dialogs for actions */}
          <CreateTaskDialog
            projectId={task.projectId}
            task={task}
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            triggerButton={<span />} // Hidden trigger
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
        </div>
      )}
    </Draggable>
  );
}
