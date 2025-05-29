"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/types";
import { Edit3, CalendarDays } from "lucide-react";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { useAppContext } from "@/context/AppContext";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: Task;
  projectId: string;
}

export function TaskCard({ task, projectId }: TaskCardProps) {
  const { moveTask } = useAppContext();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: TaskStatus) => {
    try {
      moveTask(task.id, newStatus);
      toast({ title: "Task Status Updated", description: `Task "${task.title}" moved to ${newStatus}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task status.", variant: "destructive"});
      console.error("Failed to update task status:", error);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'To Do': return 'bg-slate-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Done': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base font-semibold leading-tight">{task.title}</CardTitle>
        {task.description && (
          <CardDescription className="text-xs mt-1 h-12 overflow-hidden text-ellipsis">
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {task.deadline && (
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Deadline: {format(parseISO(task.deadline), "MMM d, yyyy")}
          </div>
        )}
         <Badge variant="secondary" className={`${getStatusColor(task.status)} text-white text-xs px-2 py-0.5`}>
            {task.status}
          </Badge>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t px-4 py-3">
        <div className="w-2/3">
        <Select value={task.status} onValueChange={(value) => handleStatusChange(value as TaskStatus)}>
            <SelectTrigger className="h-8 text-xs focus:ring-accent">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">Move to {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1">
          <CreateTaskDialog
            projectId={projectId}
            task={task}
            triggerButton={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Edit3 className="h-4 w-4" />
                <span className="sr-only">Edit Task</span>
              </Button>
            }
          />
          <DeleteTaskDialog task={task} />
        </div>
      </CardFooter>
    </Card>
  );
}
