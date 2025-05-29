
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
import { ref as storageRefFB, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"; // Renamed to avoid conflict with local storageRef
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
const CONVERTIBLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// Helper function to convert file to WebP
async function convertToWebP(file: File, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error('Failed to read file for conversion.'));
      }
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Canvas toBlob failed for WebP conversion.'));
            }
            const originalNameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const webpFileName = `${originalNameWithoutExtension}.webp`;
            resolve(new File([blob], webpFileName, { type: 'image/webp' }));
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err instanceof ErrorEvent ? err.error : new Error('Image loading failed for conversion.'));
    };
    reader.onerror = (err) => reject(err);
  });
}


export function TaskCommentsDialog({ task, triggerButton }: TaskCommentsDialogProps) {
  const { addCommentToTask, updateCommentInTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Covers upload and comment posting/updating
  const [isConvertingFile, setIsConvertingFile] = useState(false); // For image conversion
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
    setIsConvertingFile(false);
    setFileError(null);
    setEditingComment(null);
    setCurrentAttachmentName(null);
    setAttachmentAction('keep');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setAttachmentAction(editingComment?.fileURL ? 'keep' : 'remove');
        return;
      }
      setFileError(null);

      if (CONVERTIBLE_IMAGE_TYPES.includes(file.type)) {
        setIsConvertingFile(true);
        try {
          const webpFile = await convertToWebP(file);
          setSelectedFile(webpFile);
          setCurrentAttachmentName(webpFile.name);
          setAttachmentAction('replace');
        } catch (conversionError) {
          console.error("Error converting to WebP:", conversionError);
          setFileError("Failed to convert image. Original file will be used.");
          setSelectedFile(file); // Fallback to original
          setCurrentAttachmentName(file.name);
          setAttachmentAction('replace');
        } finally {
          setIsConvertingFile(false);
        }
      } else {
        setSelectedFile(file);
        setCurrentAttachmentName(file.name);
        setAttachmentAction('replace');
      }
    } else {
      if (editingComment?.fileURL && attachmentAction !== 'remove') {
         setAttachmentAction('keep');
      }
      setSelectedFile(null);
      // If editing and file input is cleared, but we want to keep the existing attachment,
      // currentAttachmentName should not be nulled unless explicitly removing.
      // This logic is handled by not setting currentAttachmentName to null here.
    }
  };

  const handleRemoveCurrentAttachment = () => {
    setCurrentAttachmentName(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAttachmentAction('remove');
    setFileError(null); // Clear file error if attachment is removed
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    form.setValue("text", comment.text);
    if (comment.fileURL && comment.fileName) {
      setCurrentAttachmentName(comment.fileName);
      setAttachmentAction('keep');
    } else {
      setCurrentAttachmentName(null);
      setAttachmentAction('remove');
    }
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileError(null);
    setIsConvertingFile(false); // Ensure conversion state is reset
  };

  const handleCancelEdit = () => {
    resetFormAndState();
  };

  const onSubmit = async (data: CommentFormValues) => {
    setIsProcessing(true);
    let fileURL: string | undefined = editingComment?.fileURL;
    let fileName: string | undefined = editingComment?.fileName;
    let oldFileToDelete: string | undefined = undefined;

    try {
      if (attachmentAction === 'replace' && selectedFile) {
        if (editingComment?.fileURL) {
          oldFileToDelete = editingComment.fileURL;
        }
        setUploadProgress(0);
        const storagePath = `task_attachments/${task.id}/${Date.now()}_${selectedFile.name}`;
        const fileStorageRefInstance = storageRefFB(storage, storagePath); // Use renamed import
        const uploadTask = uploadBytesResumable(fileStorageRefInstance, selectedFile);

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
          oldFileToDelete = editingComment.fileURL;
        }
        fileURL = undefined;
        fileName = undefined;
      }

      if (oldFileToDelete) {
        try {
          const oldFileRef = storageRefFB(storage, oldFileToDelete); // Use renamed import
          await deleteObject(oldFileRef);
        } catch (deleteError) {
          console.error("Failed to delete old attachment:", deleteError);
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save comment.", variant: "destructive" });
      console.error("Failed to save comment/upload:", error);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const sortedComments = React.useMemo(() => {
    if (!task.comments) return [];
    return [...task.comments].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [task.comments]);

  const submitButtonDisabled = isProcessing || isConvertingFile || !form.formState.isValid || (!!fileError && attachmentAction !== 'remove' && !selectedFile); // Allow submit if error is for a file that's being removed

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col h-[calc(min(85vh,700px))]">
        <DialogHeader>
          <DialogTitle>{editingComment ? 'Edit Comment' : `Comments for "${task.title}"`}</DialogTitle>
          {!editingComment && <DialogDescription>View and add comments. Max file size: 2MB. Images (JPG, PNG, GIF) will be converted to WebP.</DialogDescription>}
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
                                <span title={new Date(comment.updatedAt).toISOString()}> (edited)</span>
                            )}
                            </p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(comment)} disabled={isProcessing || isConvertingFile}>
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
                      disabled={isProcessing || isConvertingFile}
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
                  disabled={isProcessing || isConvertingFile}
                />
                {(selectedFile || (currentAttachmentName && attachmentAction !== 'remove')) && (
                  <Button type="button" variant="ghost" size="icon" onClick={handleRemoveCurrentAttachment} className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isProcessing || isConvertingFile}>
                    <XCircle className="h-4 w-4" />
                    <span className="sr-only">Clear file</span>
                  </Button>
                )}
              </div>
              {currentAttachmentName && attachmentAction === 'keep' && !selectedFile && (
                 <Badge variant="outline" className="mt-1 text-xs py-1 px-2 font-normal flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Currently attached: {currentAttachmentName}
                 </Badge>
              )}
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">Selected: {selectedFile.name}</p>
              )}
              {fileError && <FormMessage>{fileError}</FormMessage>}
            </FormItem>

            {isConvertingFile && (
                <p className="text-xs text-primary text-center">Converting image to WebP...</p>
            )}
            {isProcessing && uploadProgress !== null && uploadProgress >= 0 && !isConvertingFile && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress < 100 ? `Uploading: ${Math.round(uploadProgress)}%` : "Processing..."}
                </p>
              </div>
            )}

            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              {editingComment && (
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancelEdit} disabled={isProcessing || isConvertingFile}>
                  Cancel Edit
                </Button>
              )}
               <Button 
                 type="button" 
                 variant="ghost" 
                 className="w-full sm:w-auto sm:mr-auto" 
                 onClick={() => { resetFormAndState(); setIsOpen(false);}} 
                 disabled={isProcessing || isConvertingFile}
                >
                Close
              </Button>
               <Button type="submit" className="w-full sm:w-auto" disabled={submitButtonDisabled}>
                {isConvertingFile ? "Converting..." : (isProcessing ? (editingComment ? "Saving..." : (selectedFile ? "Uploading..." : "Posting...")) : (
                  <> <Send className="mr-2 h-4 w-4" /> {editingComment ? "Save Changes" : "Post Comment"} </>
                ))}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

