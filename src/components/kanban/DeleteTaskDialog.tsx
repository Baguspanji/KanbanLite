"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import type { Task } from "@/types";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeleteTaskDialogProps {
  task: Task;
  onDeleted?: () => void;
}

export function DeleteTaskDialog({ task, onDeleted }: DeleteTaskDialogProps) {
  const { deleteTask } = useAppContext();
  const { toast } = useToast();

  const handleDelete = () => {
    try {
      deleteTask(task.id);
      toast({ title: "Task Deleted", description: `Task "${task.title}" has been deleted.` });
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete task. Please try again.", variant: "destructive" });
      console.error("Failed to delete task:", error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Task</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the task "{task.title}". This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Delete Task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
