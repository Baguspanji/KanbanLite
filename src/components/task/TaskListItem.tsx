
"use client";

import type { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { CreateTaskDialog } from "@/components/kanban/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/kanban/DeleteTaskDialog";
import { TaskCommentsDialog } from "@/components/kanban/TaskCommentsDialog";
import { Edit3, Trash2, MessageSquare, CalendarDays } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from 'date-fns';

interface TaskListItemProps {
  task: Task;
  projectId: string;
}

export function TaskListItem({ task, projectId }: TaskListItemProps) {
  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'To Do': 
        return 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80';
      case 'On Dev': 
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
      case 'On QA':
        return 'bg-yellow-500 text-white hover:bg-yellow-500/90 dark:bg-yellow-600 dark:hover:bg-yellow-600/90';
      case 'Done': 
        return 'bg-green-500 text-white hover:bg-green-500/90 dark:bg-green-600 dark:hover:bg-green-600/90';
      default: 
        return 'bg-gray-500 text-white hover:bg-gray-500/90';
    }
  };

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell>
        <div className="font-medium break-words">{task.title}</div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate break-words" title={task.description}>
            {task.description}
          </p>
        )}
      </TableCell>
      <TableCell>
        <Badge className={`${getStatusBadgeClass(task.status)} text-xs px-2 py-0.5`}>
          {task.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">
        {task.deadline ? (
          <div className="flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
            {format(parseISO(task.deadline), "MMM d, yyyy")}
          </div>
        ) : (
          <span className="text-muted-foreground italic">None</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-1">
          <TaskCommentsDialog
            task={task}
            triggerButton={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MessageSquare className="h-4 w-4" />
                {task.comments && task.comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
          <DeleteTaskDialog task={task} />
        </div>
      </TableCell>
    </TableRow>
  );
}
