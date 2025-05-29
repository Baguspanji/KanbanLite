
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/context/AppContext";
import type { Task, Comment } from "@/types";
import { Send } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

const commentFormSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment must be 500 characters or less."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

interface TaskCommentsDialogProps {
  task: Task;
  triggerButton: React.ReactNode;
}

export function TaskCommentsDialog({ task, triggerButton }: TaskCommentsDialogProps) {
  const { addCommentToTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { text: "" },
  });

  const onSubmit = (data: CommentFormValues) => {
    try {
      addCommentToTask(task.id, data.text);
      toast({ title: "Comment Added", description: "Your comment has been posted." });
      form.reset(); 
    } catch (error) {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
      console.error("Failed to add comment:", error);
    }
  };

  const sortedComments = React.useMemo(() => {
    if (!task.comments) return [];
    return [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [task.comments]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col h-[calc(min(80vh,600px))]">
        <DialogHeader>
          <DialogTitle>Comments for "{task.title}"</DialogTitle>
          <DialogDescription>View and add comments to this task.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-hidden py-4">
          <ScrollArea className="h-full pr-3">
            {sortedComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {sortedComments.map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    <div className="p-3 rounded-md border bg-card shadow-sm">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {index < sortedComments.length -1 && <Separator className="my-2"/>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-4 border-t">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Add a comment</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write a comment..."
                      className="resize-none min-h-[60px]"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-0 sm:justify-between">
               <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
                {form.formState.isSubmitting ? "Posting..." : <> <Send className="mr-2 h-4 w-4" /> Post Comment </>}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
