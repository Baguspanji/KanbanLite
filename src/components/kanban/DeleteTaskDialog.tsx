
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
  triggerButton?: React.ReactNode; // Make trigger optional for programmatic control
  open?: boolean; // For programmatic control
  onOpenChange?: (open: boolean) => void; // For programmatic control
}

export function DeleteTaskDialog({ task, onDeleted, triggerButton, open, onOpenChange }: DeleteTaskDialogProps) {
  const { deleteTask } = useAppContext();
  const { toast } = useToast();

  const handleDelete = () => {
    try {
      deleteTask(task.projectId, task.id); 
      toast({ title: "Task Deleted", description: `Task "${task.title}" has been deleted.` });
      if (onDeleted) {
        onDeleted();
      }
      if (onOpenChange) { // Close dialog if controlled
        onOpenChange(false);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete task. Please try again.", variant: "destructive" });
      console.error("Failed to delete task:", error);
    }
  };

  const dialogContent = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
        <AlertDialogDescription>
          This action will permanently delete the task "{task.title}". This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel 
          className="w-full sm:w-auto" 
          onClick={() => onOpenChange && onOpenChange(false)}
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction 
          onClick={handleDelete} 
          className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          Delete Task
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (triggerButton) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          {triggerButton}
        </AlertDialogTrigger>
        {dialogContent}
      </AlertDialog>
    );
  }

  // For programmatic control
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </AlertDialog>
  );
}
