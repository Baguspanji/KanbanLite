
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input"; // For file input
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/context/AppContext";
import type { Task, Comment } from "@/types";
import { Send, Paperclip, XCircle, UploadCloud } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase"; // Import Firebase storage
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from "@/components/ui/progress";

const commentFormSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty.").max(500, "Comment must be 500 characters or less."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

interface TaskCommentsDialogProps {
  task: Task;
  triggerButton: React.ReactNode;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function TaskCommentsDialog({ task, triggerButton }: TaskCommentsDialogProps) {
  const { addCommentToTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { text: "" },
  });

  useEffect(() => {
    // Reset file state when dialog opens/closes or task changes
    if (!isOpen) {
      setSelectedFile(null);
      setUploadProgress(null);
      setIsUploading(false);
      setFileError(null);
      form.reset();
    }
  }, [isOpen, task, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        setSelectedFile(null);
        event.target.value = ""; // Clear the input
        return;
      }
      setSelectedFile(file);
      setFileError(null);
    } else {
      setSelectedFile(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileError(null);
    // Reset the file input visually
    const fileInput = document.getElementById('comment-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const onSubmit = async (data: CommentFormValues) => {
    setIsUploading(true); // Covers both file upload and comment posting
    let fileURL: string | undefined = undefined;
    let fileName: string | undefined = undefined;

    try {
      if (selectedFile) {
        setUploadProgress(0);
        const storagePath = `task_attachments/${task.id}/${Date.now()}_${selectedFile.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              toast({ title: "File Upload Failed", description: error.message, variant: "destructive" });
              reject(error);
            },
            async () => {
              fileURL = await getDownloadURL(uploadTask.snapshot.ref);
              fileName = selectedFile.name;
              resolve();
            }
          );
        });
      }

      await addCommentToTask(task.id, { text: data.text, fileURL, fileName });
      toast({ title: "Comment Added", description: "Your comment has been posted." });
      form.reset();
      clearSelectedFile();
      // setIsOpen(false); // Keep dialog open to see new comment, or close if preferred
    } catch (error) {
      toast({ title: "Error", description: "Failed to add comment or upload file.", variant: "destructive" });
      console.error("Failed to add comment/upload:", error);
      // If upload succeeded but comment failed, consider deleting the orphaned file from storage
      if (fileURL && error) { // Check if it's a comment posting error after successful upload
        try {
          const fileRefToDelete = ref(storage, fileURL);
          await deleteObject(fileRefToDelete);
          console.log("Orphaned file deleted from storage.");
        } catch (deleteError) {
          console.error("Failed to delete orphaned file:", deleteError);
        }
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const sortedComments = React.useMemo(() => {
    if (!task.comments) return [];
    return [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [task.comments]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col h-[calc(min(85vh,700px))]">
        <DialogHeader>
          <DialogTitle>Comments for "{task.title}"</DialogTitle>
          <DialogDescription>View and add comments to this task. Max file size: 2MB.</DialogDescription>
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
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.text}</p>
                      {comment.fileURL && comment.fileName && (
                        <a
                          href={comment.fileURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
                        >
                          <Paperclip className="mr-1.5 h-4 w-4 flex-shrink-0" />
                          {comment.fileName}
                        </a>
                      )}
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
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel htmlFor="comment-file-input" className="text-sm font-medium">Attach File (Optional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="comment-file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="text-sm file:mr-2 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading}
                />
                {selectedFile && !isUploading && (
                  <Button type="button" variant="ghost" size="icon" onClick={clearSelectedFile} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="sr-only">Clear file</span>
                  </Button>
                )}
              </div>
              {selectedFile && !isUploading && (
                <p className="text-xs text-muted-foreground mt-1">Selected: {selectedFile.name}</p>
              )}
              {fileError && <FormMessage>{fileError}</FormMessage>}
            </FormItem>

            {isUploading && uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress < 100 ? `Uploading file: ${Math.round(uploadProgress)}%` : "Processing..."}
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
               <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(false)} disabled={isUploading}>
                Close
              </Button>
               <Button type="submit" className="w-full sm:w-auto" disabled={isUploading || !form.formState.isValid || !!fileError}>
                {isUploading ? (selectedFile ? "Uploading..." : "Posting...") : <> <Send className="mr-2 h-4 w-4" /> Post Comment </>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
