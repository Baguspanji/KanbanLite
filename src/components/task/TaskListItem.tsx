
"use client";

import type { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
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
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`hover:bg-muted/20 ${snapshot.isDragging ? 'bg-primary/10 shadow-lg' : ''}`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <TableCell
            {...provided.dragHandleProps}
            className="w-px pr-0 pl-3 py-3 cursor-grab" // Adjusted padding
            style={{ verticalAlign: 'middle' }} // Ensure vertical alignment
          >
            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </TableCell>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                    <MessageSquare className="h-4 w-4" />
                    {task.comments && task.comments.length > 0 && (
                      <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
      )}
    </Draggable>
  );
}
