
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
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/types";
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
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskDialogProps {
  projectId: string;
  task?: Task;
  triggerButton?: React.ReactNode;
  defaultStatus?: TaskStatus;
  open?: boolean; // For controlled mode
  onOpenChange?: (open: boolean) => void; // For controlled mode
}

export function CreateTaskDialog({
  projectId,
  task,
  triggerButton,
  defaultStatus = 'To Do',
  open: controlledOpen,
  onOpenChange: controlledSetOpen,
}: CreateTaskDialogProps) {
  const { addTask, updateTask } = useAppContext();
  const { toast } = useToast();

  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && controlledSetOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalIsOpen;

  const handleRadixOpenChange = (newOpenState: boolean) => {
    if (isControlled) {
      controlledSetOpen(newOpenState);
    } else {
      setInternalIsOpen(newOpenState);
    }
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: undefined,
      status: defaultStatus,
      priority: 'Medium',
    },
  });

  useEffect(() => {
    if (task && isOpen) {
      form.reset({
        title: task.title,
        description: task.description || "",
        deadline: task.deadline ? parseISO(task.deadline) : undefined,
        status: task.status,
        priority: task.priority || 'Medium',
      });
    } else if (!task && isOpen) { // Only reset to default if creating new and dialog opens
      form.reset({
        title: "",
        description: "",
        deadline: undefined,
        status: defaultStatus,
        priority: 'Medium',
      });
    }
    // Reset form if dialog closes and it was an edit operation
    if (!isOpen && task && form.formState.isDirty) {
        // Optionally, you can reset to initial values if the dialog for an existing task is closed without saving.
        // This depends on desired UX. For now, the above logic handles reset on open.
    }

  }, [task, isOpen, form, defaultStatus]);


  const onSubmit = (data: TaskFormValues) => {
    try {
      if (task) {
        updateTask(projectId, task.id, {
          title: data.title,
          description: data.description,
          deadline: data.deadline ? data.deadline.toISOString().split('T')[0] : undefined,
          status: data.status as TaskStatus,
          priority: data.priority as TaskPriority,
        });
        toast({ title: "Task Updated", description: `Task "${data.title}" has been updated.` });
      } else {
        addTask(projectId, data.title, data.description, data.deadline || undefined, data.status as TaskStatus, data.priority as TaskPriority);
        toast({ title: "Task Created", description: `Task "${data.title}" has been created.` });
      }
      handleRadixOpenChange(false); // Close dialog
      // Form is reset by useEffect when isOpen changes or task changes
    } catch (error) {
      toast({ title: "Error", description: "Failed to save task. Please try again.", variant: "destructive" });
      console.error("Failed to save task:", error);
    }
  };
  
  const defaultTriggerContent = (
    <Button variant="outline" size="sm">
      <PlusCircle className="mr-2 h-4 w-4" /> Add Task
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleRadixOpenChange}>
      <DialogTrigger asChild>
        {/* If triggerButton is explicitly undefined and not controlled, use default.
            If triggerButton is provided (even null/span for controlled), use that.
        */}
        {triggerButton !== undefined ? triggerButton : defaultTriggerContent}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'Medium'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => handleRadixOpenChange(false)}>
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

    