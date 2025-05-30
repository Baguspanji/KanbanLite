
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/types";
import { Edit3, CalendarDays, MessageSquare, GripVertical } from "lucide-react";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { useAppContext } from "@/context/AppContext";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Draggable } from '@hello-pangea/dnd';

interface TaskCardProps {
  task: Task; // Task object now includes projectId
  // projectId is no longer needed as a separate prop if task object contains it
  index: number;
}

export function TaskCard({ task, index }: TaskCardProps) {
  const { moveTask } = useAppContext();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: TaskStatus) => {
    try {
      // moveTask now requires projectId
      moveTask(task.projectId, task.id, newStatus);
      toast({ title: "Task Status Updated", description: `Task "${task.title}" moved to ${newStatus}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task status.", variant: "destructive"});
      console.error("Failed to update task status:", error);
    }
  };

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
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={false}
      // ignoreContainerClipping={false} // Already added
    >
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`w-full min-w-0 mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card ${snapshot.isDragging ? 'shadow-2xl scale-105 opacity-95 ring-2 ring-primary' : ''}`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <CardHeader className="pb-3 pt-4 px-4 relative w-full min-w-0">
            <div
              {...provided.dragHandleProps}
              className="absolute top-3 right-2 p-1 cursor-grab text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Drag task"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-semibold leading-tight break-words pr-8 w-full min-w-0">{task.title}</CardTitle>
            {task.description && (
              <CardDescription
                className="text-xs mt-1 line-clamp-2 break-words"
                title={task.description}
              >
                {task.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {task.deadline && (
              <div className="flex items-center text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                Deadline: {format(parseISO(task.deadline), "MMM d, yyyy")}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Badge className={`${getStatusBadgeClass(task.status)} text-xs px-2 py-0.5`}>
                  {task.status}
                </Badge>
              {task.comments && task.comments.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal h-6 px-1.5 py-0.5">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 border-t px-4 py-3">
            <div className="w-full sm:flex-grow">
            <Select value={task.status} onValueChange={(value) => handleStatusChange(value as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs focus:ring-accent w-full">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">Move to {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 self-end sm:self-center">
              <TaskCommentsDialog
                task={task} // Task object now includes projectId
                triggerButton={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">View Comments</span>
                  </Button>
                }
              />
              <CreateTaskDialog
                projectId={task.projectId} // Pass projectId from task object
                task={task}
                triggerButton={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit Task</span>
                  </Button>
                }
              />
              <DeleteTaskDialog task={task} /> {/* Task object includes projectId */}
            </div>
          </CardFooter>
        </Card>
      )}
    </Draggable>
  );
}
