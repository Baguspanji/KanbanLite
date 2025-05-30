
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/AppContext";
import type { Task, TaskStatus } from "@/types"; // Task type no longer has projectId for direct storage
import { TASK_STATUSES } from "@/types";
import { PlusCircle, Edit3, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100, "Title must be 100 characters or less."),
  description: z.string().max(500, "Description must be 500 characters or less.").optional(),
  deadline: z.date().optional().nullable(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskDialogProps {
  projectId: string; // Still needed to know where to add/update the task
  task?: Task; // For editing, this task object will include projectId from AppContext
  triggerButton?: React.ReactNode;
  defaultStatus?: TaskStatus;
}

export function CreateTaskDialog({ projectId, task, triggerButton, defaultStatus = 'To Do' }: CreateTaskDialogProps) {
  const { addTask, updateTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: undefined,
      status: defaultStatus,
    },
  });

  useEffect(() => {
    if (task && isOpen) {
      form.reset({
        title: task.title,
        description: task.description || "",
        deadline: task.deadline ? parseISO(task.deadline) : undefined,
        status: task.status,
      });
    } else if (!task && isOpen) {
      form.reset({
        title: "",
        description: "",
        deadline: undefined,
        status: defaultStatus,
      });
    }
  }, [task, isOpen, form, defaultStatus]);

  const onSubmit = (data: TaskFormValues) => {
    try {
      if (task) {
        // For updateTask, we pass projectId and taskId separately.
        // The 'updates' object should not contain projectId.
        updateTask(projectId, task.id, { 
          title: data.title, 
          description: data.description, 
          deadline: data.deadline ? data.deadline.toISOString().split('T')[0] : undefined,
          status: data.status as TaskStatus
        });
        toast({ title: "Task Updated", description: `Task "${data.title}" has been updated.` });
      } else {
        // addTask still needs projectId, but it's not part of the task document data.
        addTask(projectId, data.title, data.description, data.deadline || undefined, data.status as TaskStatus);
        toast({ title: "Task Created", description: `Task "${data.title}" has been created.` });
      }
      setIsOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save task. Please try again.", variant: "destructive" });
      console.error("Failed to save task:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : (
          <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details of your task." : "Enter the details for your new task."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Design homepage" {...field} />
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
                      placeholder="Detailed description of the task..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (task ? "Saving..." : "Creating...") : (task ? "Save Changes" : "Create Task")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
