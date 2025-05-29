
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import type { Project } from "@/types";
import { PlusCircle, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";


const projectFormSchema = z.object({
  name: z.string().min(1, { message: "Project name is required." }).max(50, { message: "Project name must be 50 characters or less." }),
  description: z.string().max(200, { message: "Description must be 200 characters or less." }).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectDialogProps {
  project?: Project; // For editing
  triggerButton?: React.ReactNode;
}

export function CreateProjectDialog({ project, triggerButton }: CreateProjectDialogProps) {
  const { addProject, updateProject } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (project && isOpen) {
      form.reset({
        name: project.name,
        description: project.description || "",
      });
    } else if (!project && isOpen) {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [project, isOpen, form]);

  const onSubmit = (data: ProjectFormValues) => {
    try {
      if (project) {
        updateProject(project.id, data.name, data.description);
        toast({ title: "Project Updated", description: `Project "${data.name}" has been updated.` });
      } else {
        addProject(data.name, data.description);
        toast({ title: "Project Created", description: `Project "${data.name}" has been created.` });
      }
      setIsOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save project. Please try again.", variant: "destructive" });
      console.error("Failed to save project:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the details of your project." : "Enter the details for your new project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Website Redesign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of the project."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (project ? "Saving..." : "Creating...") : (project ? "Save Changes" : "Create Project")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
