
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/context/AppContext";
import type { Task, Comment } from "@/types";
import { Send, Paperclip, XCircle, UploadCloud, Edit2, Trash2, FileText } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
  const { addCommentToTask, updateCommentInTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Covers upload and comment posting/updating
  const [fileError, setFileError] = useState<string | null>(null);
  const { toast } = useToast();

  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [currentAttachmentName, setCurrentAttachmentName] = useState<string | null>(null);
  const [attachmentAction, setAttachmentAction] = useState<'keep' | 'remove' | 'replace'>('keep');


  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { text: "" },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      resetFormAndState();
    }
  }, [isOpen, task]);

  const resetFormAndState = () => {
    form.reset({ text: "" });
    setSelectedFile(null);
    setUploadProgress(null);
    setIsProcessing(false);
    setFileError(null);
    setEditingComment(null);
    setCurrentAttachmentName(null);
    setAttachmentAction('keep');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the input
        setAttachmentAction(editingComment?.fileURL ? 'keep' : 'remove'); // Revert if was editing
        return;
      }
      setSelectedFile(file);
      setFileError(null);
      setCurrentAttachmentName(file.name);
      setAttachmentAction('replace');
    } else {
      // If file input is cleared, and we were editing with an existing attachment
      if (editingComment?.fileURL && attachmentAction !== 'remove') {
         setAttachmentAction('keep'); // User cleared selection, might want to keep original
      }
      setSelectedFile(null);
    }
  };

  const handleRemoveCurrentAttachment = () => {
    setCurrentAttachmentName(null);
    setSelectedFile(null); // Ensure no new file is also selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAttachmentAction('remove');
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    form.setValue("text", comment.text);
    if (comment.fileURL && comment.fileName) {
      setCurrentAttachmentName(comment.fileName);
      setAttachmentAction('keep');
    } else {
      setCurrentAttachmentName(null);
      setAttachmentAction('remove'); // No existing file, so 'remove' means no file
    }
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileError(null);
  };

  const handleCancelEdit = () => {
    resetFormAndState(); // Resets form and all editing states
  };

  const onSubmit = async (data: CommentFormValues) => {
    setIsProcessing(true);
    let fileURL: string | undefined = editingComment?.fileURL;
    let fileName: string | undefined = editingComment?.fileName;
    let oldFileToDelete: string | undefined = undefined;

    try {
      if (attachmentAction === 'replace' && selectedFile) {
        if (editingComment?.fileURL) {
          oldFileToDelete = editingComment.fileURL; // Mark old file for deletion
        }
        setUploadProgress(0);
        const storagePath = `task_attachments/${task.id}/${Date.now()}_${selectedFile.name}`;
        const fileStorageRef = storageRef(storage, storagePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              reject(error);
            },
            async () => {
              fileURL = await getDownloadURL(uploadTask.snapshot.ref);
              fileName = selectedFile.name;
              resolve();
            }
          );
        });
      } else if (attachmentAction === 'remove') {
        if (editingComment?.fileURL) {
          oldFileToDelete = editingComment.fileURL; // Mark old file for deletion
        }
        fileURL = undefined;
        fileName = undefined;
      }
      // If attachmentAction is 'keep', fileURL and fileName remain as initialized from editingComment

      // Now, delete the old file if marked
      if (oldFileToDelete) {
        try {
          const oldFileRef = storageRef(storage, oldFileToDelete);
          await deleteObject(oldFileRef);
        } catch (deleteError) {
          console.error("Failed to delete old attachment:", deleteError);
          // Continue, as the main operation might still succeed
        }
      }

      const commentPayload = { text: data.text, fileURL, fileName };

      if (editingComment) {
        await updateCommentInTask(task.id, editingComment.id, commentPayload);
        toast({ title: "Comment Updated", description: "Your comment has been updated." });
      } else {
        await addCommentToTask(task.id, commentPayload);
        toast({ title: "Comment Added", description: "Your comment has been posted." });
      }
      resetFormAndState();
      // setIsOpen(false); // Keep dialog open for now
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save comment.", variant: "destructive" });
      console.error("Failed to save comment/upload:", error);
      // If upload succeeded but comment save failed with a new file, we don't delete the newly uploaded file here.
      // It's complex to manage; for now, it might become an orphan.
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const sortedComments = React.useMemo(() => {
    if (!task.comments) return [];
    return [...task.comments].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [task.comments]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col h-[calc(min(85vh,700px))]">
        <DialogHeader>
          <DialogTitle>{editingComment ? 'Edit Comment' : `Comments for "${task.title}"`}</DialogTitle>
          {!editingComment && <DialogDescription>View and add comments. Max file size: 2MB.</DialogDescription>}
        </DialogHeader>

        <div className="flex-grow overflow-y-hidden py-4">
          <ScrollArea className="h-full pr-3">
            {sortedComments.length === 0 && !editingComment ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {sortedComments.map((comment) => (
                  <React.Fragment key={comment.id}>
                    {editingComment?.id !== comment.id && (
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
                        <div className="flex justify-between items-center mt-1.5">
                            <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true })}
                            {comment.updatedAt && (
                                <span title={formatISO(parseISO(comment.updatedAt))}> (edited)</span>
                            )}
                            </p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(comment)} disabled={isProcessing}>
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit comment</span>
                          </Button>
                        </div>
                      </div>
                    )}
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
                  <FormLabel className="sr-only">{editingComment ? "Edit comment" : "Add a comment"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={editingComment ? "Edit your comment..." : "Write a comment..."}
                      className="resize-none min-h-[60px]"
                      rows={2}
                      {...field}
                      disabled={isProcessing}
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
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="text-sm file:mr-2 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing}
                />
                {(selectedFile || (editingComment && currentAttachmentName && attachmentAction !== 'remove')) && !isProcessing && (
                  <Button type="button" variant="ghost" size="icon" onClick={handleRemoveCurrentAttachment} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="sr-only">Clear file</span>
                  </Button>
                )}
              </div>
              {currentAttachmentName && !selectedFile && attachmentAction === 'keep' && (
                 <Badge variant="outline" className="mt-1 text-xs py-1 px-2 font-normal flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Currently attached: {currentAttachmentName}
                 </Badge>
              )}
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">Selected to upload: {selectedFile.name}</p>
              )}
              {fileError && <FormMessage>{fileError}</FormMessage>}
            </FormItem>

            {isProcessing && uploadProgress !== null && uploadProgress >= 0 && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress < 100 ? `Uploading: ${Math.round(uploadProgress)}%` : "Processing..."}
                </p>
              </div>
            )}

            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              {editingComment && (
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancelEdit} disabled={isProcessing}>
                  Cancel Edit
                </Button>
              )}
               <Button 
                 type="button" 
                 variant="ghost" 
                 className="w-full sm:w-auto sm:mr-auto" 
                 onClick={() => { resetFormAndState(); setIsOpen(false);}} 
                 disabled={isProcessing}
                >
                Close
              </Button>
               <Button type="submit" className="w-full sm:w-auto" disabled={isProcessing || !form.formState.isValid || !!fileError}>
                {isProcessing ? (editingComment ? "Saving..." : (selectedFile ? "Uploading..." : "Posting...")) : (
                  <> <Send className="mr-2 h-4 w-4" /> {editingComment ? "Save Changes" : "Post Comment"} </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
