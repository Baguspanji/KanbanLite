
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
import type { Project } from "@/types";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeleteProjectDialogProps {
  project: Project;
  onDeleted?: () => void;
  triggerButton?: React.ReactNode; // Allow custom trigger
}

export function DeleteProjectDialog({ project, onDeleted, triggerButton }: DeleteProjectDialogProps) {
  const { deleteProject } = useAppContext();
  const { toast } = useToast();

  const handleDelete = () => {
    try {
      deleteProject(project.id);
      toast({ title: "Project Deleted", description: `Project "${project.name}" and its tasks have been deleted.` });
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete project. Please try again.", variant: "destructive" });
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {triggerButton ? triggerButton : (
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete Project</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the project "{project.name}" and all of its associated tasks. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Delete Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
