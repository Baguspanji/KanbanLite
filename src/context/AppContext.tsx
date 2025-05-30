
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { parseISO } from 'date-fns';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
  Timestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  getDoc,
  collectionGroup
} from 'firebase/firestore';
import { ref as storageRefFB, deleteObject } from "firebase/storage";
import { TASK_STATUSES } from '@/types'; // Import TASK_STATUSES

type Theme = 'light' | 'dark';

interface CommentData {
  text: string;
  fileURL?: string;
  fileName?: string;
}

type TaskUpdatableData = Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>;

interface AppContextType {
  projects: Project[];
  tasks: Task[];
  theme: Theme;
  toggleTheme: () => void;
  addProject: (name: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, name: string, description?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  addTask: (projectId: string, title: string, description?: string, deadline?: Date, status?: TaskStatus) => Promise<Omit<Task, 'projectId'> | null>;
  updateTask: (projectId: string, taskId: string, updates: TaskUpdatableData) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  getTasksByProjectId: (projectId: string) => Task[];
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus) => Promise<void>;
  reorderTasksInList: (projectId: string, sourceIndex: number, destinationIndex: number) => Promise<void>;
  addCommentToTask: (projectId: string, taskId: string, commentData: CommentData) => Promise<void>;
  updateCommentInTask: (projectId: string, taskId: string, commentId: string, updatedCommentData: CommentData) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [theme, setTheme] = useLocalStorage<Theme>('kanbanlite-theme', 'light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    setIsLoading(true);
    const projectsCollectionRef = collection(db, 'projects');
    const unsubscribeProjects = onSnapshot(projectsCollectionRef, (snapshot) => {
      const loadedProjects = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: (docSnap.data().createdAt as Timestamp).toDate().toISOString(),
      } as Project));
      setProjects(loadedProjects);
    }, (error) => {
      console.error("Error fetching projects: ", error);
    });

    // Query for tasks subcollection across all projects
    const tasksQuery = query(collectionGroup(db, 'tasks'), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const projectId = docSnap.ref.parent.parent!.id; // Get projectId from parent path

        let deadlineISO: string | undefined = undefined;
        if (data.deadline) {
          if (data.deadline instanceof Timestamp) {
            deadlineISO = data.deadline.toDate().toISOString();
          } else if (typeof data.deadline === 'string') {
            deadlineISO = data.deadline;
          }
        }
        
        const comments = (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt instanceof Timestamp
                      ? comment.createdAt.toDate().toISOString()
                      : (typeof comment.createdAt === 'string' ? comment.createdAt : new Date().toISOString()),
          updatedAt: comment.updatedAt instanceof Timestamp
                      ? comment.updatedAt.toDate().toISOString()
                      : (typeof comment.updatedAt === 'string' ? comment.updatedAt : undefined),
          fileURL: comment.fileURL || undefined,
          fileName: comment.fileName || undefined,
        }));

        return {
          id: docSnap.id,
          projectId: projectId,
          title: data.title || "Untitled Task",
          description: data.description || "",
          status: data.status || "To Do",
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          deadline: deadlineISO,
          comments: comments,
          order: typeof data.order === 'number' ? data.order : Date.now(),
        } as Task;
      });
      setTasks(loadedTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tasks using collectionGroup: ", error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, []);

  const addProject = useCallback(async (name: string, description?: string): Promise<Project | null> => {
    const newProjectData = {
      name,
      description: description || "",
      createdAt: Timestamp.fromDate(new Date()),
    };
    try {
      const docRef = await addDoc(collection(db, 'projects'), newProjectData);
      return { id: docRef.id, ...newProjectData, createdAt: newProjectData.createdAt.toDate().toISOString() };
    } catch (error) {
      console.error("Error adding project: ", error);
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, name: string, description?: string) => {
    const projectDocRef = doc(db, 'projects', id);
    const updates: { name: string; description?: string } = { name };
    if (description !== undefined) {
      updates.description = description;
    }
    try {
      await updateDoc(projectDocRef, updates);
    } catch (error) {
      console.error("Error updating project: ", error);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const projectDocRef = doc(db, 'projects', id);
    // Reference to the 'tasks' subcollection within the project
    const tasksSubcollectionRef = collection(db, 'projects', id, 'tasks');

    try {
      const batch = writeBatch(db);
      // Get all tasks in the subcollection
      const tasksSnapshot = await getDocs(tasksSubcollectionRef);
      const fileDeletionPromises: Promise<void>[] = [];

      console.log(`Project ${id}: Starting deletion. Found ${tasksSnapshot.docs.length} tasks in subcollection.`);

      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        if (taskData.comments && Array.isArray(taskData.comments)) {
          console.log(`Project ${id}, Task ${taskDoc.id}: Found ${taskData.comments.length} comments. Checking for attachments.`);
          for (const comment of taskData.comments) {
            if (comment.fileURL && typeof comment.fileURL === 'string') {
              fileDeletionPromises.push(
                (async () => {
                  console.log(`Project ${id}, Task ${taskDoc.id}: Attempting to delete attachment ${comment.fileURL}`);
                  try {
                    const fileRef = storageRefFB(storage, comment.fileURL);
                    await deleteObject(fileRef);
                    console.log(`Project ${id}, Task ${taskDoc.id}: Successfully deleted attachment ${comment.fileURL}`);
                  } catch (err: any) {
                     if (err.code === 'storage/object-not-found') {
                      console.warn(`Project ${id}, Task ${taskDoc.id}: Attachment ${comment.fileURL} not found. Skipping.`);
                    } else {
                      console.error(`Project ${id}, Task ${taskDoc.id}: Error deleting attachment ${comment.fileURL}:`, err);
                    }
                  }
                })()
              );
            }
          }
        }
        batch.delete(taskDoc.ref); // Delete the task document
      }

      if (fileDeletionPromises.length > 0) {
        console.log(`Project ${id}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts to settle.`);
        await Promise.allSettled(fileDeletionPromises);
        console.log(`Project ${id}: All attachment deletion attempts for its tasks have been processed.`);
      } else {
        console.log(`Project ${id}: No attachments found to delete for its tasks.`);
      }
      
      // After deleting all tasks (and their attachments), delete the project document
      batch.delete(projectDocRef);
      await batch.commit();
      console.log(`Project ${id} and its tasks subcollection successfully deleted from Firestore.`);
    } catch (error) {
      console.error(`Error deleting project ${id} and its tasks subcollection: `, error);
      throw error;
    }
  }, []);


  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  const addTask = useCallback(async (projectId: string, title: string, description?: string, deadline?: Date, status: TaskStatus = 'To Do'): Promise<Omit<Task, 'projectId'> | null> => {
    // Data for the task document (no projectId here as it's part of the path)
    const newTaskDocumentData: {
      title: string;
      description: string;
      status: TaskStatus;
      createdAt: Timestamp;
      comments: Comment[];
      order: number;
      deadline: Timestamp | null;
    } = {
      title,
      description: description || "",
      status,
      createdAt: Timestamp.fromDate(new Date()),
      comments: [],
      order: Date.now(), // Using timestamp for initial order
      deadline: deadline ? Timestamp.fromDate(deadline) : null,
    };

    try {
      // Add to the 'tasks' subcollection of the specified project
      const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
      const docRef = await addDoc(tasksCollectionRef, newTaskDocumentData);
      
      // Return task data without projectId (as it's not stored in the doc itself)
      // but client-side Task type expects projectId, which is added by the listener
      return {
        id: docRef.id,
        title: newTaskDocumentData.title,
        description: newTaskDocumentData.description,
        status: newTaskDocumentData.status,
        createdAt: newTaskDocumentData.createdAt.toDate().toISOString(),
        deadline: newTaskDocumentData.deadline ? newTaskDocumentData.deadline.toDate().toISOString() : undefined,
        comments: [], // Fresh comments array
        order: newTaskDocumentData.order,
      };
    } catch (error) {
      console.error("Error adding task to project subcollection: ", error);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (projectId: string, taskId: string, taskUpdates: TaskUpdatableData) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    // Remove projectId from updates if it exists, as it's not part of the task document
    const { projectId: _, ...validTaskUpdates } = taskUpdates as any; // Use 'any' to allow destructuring projectId
    
    const updatesToSend: { [key: string]: any } = {};

    if (validTaskUpdates.title !== undefined) updatesToSend.title = validTaskUpdates.title;
    // Ensure description is explicitly set to empty string if cleared, or to the new value
    if (validTaskUpdates.hasOwnProperty('description')) {
      updatesToSend.description = validTaskUpdates.description || "";
    }
    if (validTaskUpdates.status !== undefined) updatesToSend.status = validTaskUpdates.status;
    
    if (validTaskUpdates.hasOwnProperty('deadline')) { // Check if deadline key exists in updates
      if (validTaskUpdates.deadline && typeof validTaskUpdates.deadline === 'string') {
         updatesToSend.deadline = Timestamp.fromDate(parseISO(validTaskUpdates.deadline));
      } else if (validTaskUpdates.deadline instanceof Date) { // If it's a Date object
         updatesToSend.deadline = Timestamp.fromDate(validTaskUpdates.deadline);
      } else if (validTaskUpdates.deadline === null || validTaskUpdates.deadline === undefined) {
        // Explicitly set to null if cleared or undefined
        updatesToSend.deadline = null;
      }
    }

    if (validTaskUpdates.order !== undefined) updatesToSend.order = validTaskUpdates.order;
    
    // Handle comments update (ensure Timestamps are correctly formatted for Firestore)
    if (validTaskUpdates.comments !== undefined) {
        updatesToSend.comments = validTaskUpdates.comments.map((c: Comment) => {
        const firestoreComment: any = {
          id: c.id,
          text: c.text,
          createdAt: c.createdAt ? Timestamp.fromDate(parseISO(c.createdAt)) : Timestamp.fromDate(new Date()),
        };
        if (c.updatedAt) {
          firestoreComment.updatedAt = Timestamp.fromDate(parseISO(c.updatedAt));
        }
        // Only include fileURL and fileName if they are defined (not null or undefined)
        if (c.fileURL != null) firestoreComment.fileURL = c.fileURL;
        if (c.fileName != null) firestoreComment.fileName = c.fileName;
        return firestoreComment;
      });
    }

    if (Object.keys(updatesToSend).length === 0) return; // No actual updates to send

    try {
      await updateDoc(taskDocRef, updatesToSend);
    } catch (error) {
      console.error(`Error updating task ${taskId} in project ${projectId}: `, error);
    }
  }, []);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    try {
      // First, get the task document to check for comment attachments
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        if (taskData.comments && Array.isArray(taskData.comments) && taskData.comments.length > 0) {
          const fileDeletionPromises: Promise<void>[] = [];
          console.log(`Task ${taskId} in Project ${projectId}: Preparing to delete attachments for ${taskData.comments.length} comment(s).`);
          for (const comment of taskData.comments) {
            if (comment.fileURL && typeof comment.fileURL === 'string') {
                fileDeletionPromises.push(
                (async () => {
                  console.log(`Task ${taskId}: Attempting to delete attachment ${comment.fileURL}`);
                  try {
                    const fileRef = storageRefFB(storage, comment.fileURL);
                    await deleteObject(fileRef);
                    console.log(`Task ${taskId}: Successfully deleted attachment ${comment.fileURL}`);
                  } catch (err: any) {
                    if (err.code === 'storage/object-not-found') {
                      console.warn(`Task ${taskId}: Attachment ${comment.fileURL} not found. Skipping.`);
                    } else {
                      console.error(`Task ${taskId}: Error deleting attachment ${comment.fileURL}:`, err);
                      // Decide if you want to re-throw or just log. For now, logging.
                    }
                  }
                })()
              );
            }
          }
          if (fileDeletionPromises.length > 0) {
            console.log(`Task ${taskId}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts to settle.`);
            await Promise.allSettled(fileDeletionPromises); // Wait for all deletions or failures
            console.log(`Task ${taskId}: Attachment deletion attempts processed.`);
          }
        } else {
          console.log(`Task ${taskId}: No comments with attachments found.`);
        }
      } else {
        console.warn(`Task ${taskId} in Project ${projectId} not found for attachment deletion checks. It might have been already deleted.`);
      }

      // After attempting to delete attachments, delete the task document itself
      await deleteDoc(taskDocRef);
      console.log(`Task ${taskId} successfully deleted from Project ${projectId}.`);
    } catch (error) {
      console.error(`Error deleting task ${taskId} from project ${projectId}: `, error);
      throw error; // Re-throw to allow UI to handle error if needed
    }
  }, []);


  const getTasksByProjectId = useCallback((targetProjectId: string): Task[] => {
    return tasks
      .filter((task) => task.projectId === targetProjectId)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [tasks]);

  const moveTask = useCallback(async (projectId: string, taskId: string, newStatus: TaskStatus) => {
    // Critical Check 1: Ensure taskId is not a status string (defensive, should be caught by caller)
    if (TASK_STATUSES.includes(taskId as TaskStatus)) {
        console.error(`[AppContext moveTask] CRITICAL ERROR: taskId is a status string: "${taskId}". Aborting Firestore update.`);
        // Optionally, throw an error to alert the caller
        // throw new Error(`Invalid taskId: ${taskId} is a status string.`);
        return;
    }
    // Critical Check 2: Ensure newStatus is a valid TaskStatus and not undefined/null
    if (!newStatus || !TASK_STATUSES.includes(newStatus)) {
        console.error(`[AppContext moveTask] CRITICAL ERROR: newStatus is invalid or undefined: "${newStatus}". Aborting Firestore update.`);
        // throw new Error(`Invalid newStatus: ${newStatus}.`);
        return;
    }

    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    try {
      await updateDoc(taskDocRef, { status: newStatus });
    } catch (error) {
      console.error(`Error moving task ${taskId} in project ${projectId} to status ${newStatus}: `, error);
      throw error; 
    }
  }, []);
  
  const reorderTasksInList = useCallback(async (targetProjectId: string, sourceIndex: number, destinationIndex: number) => {
    const projectTasks = getTasksByProjectId(targetProjectId); // This already returns sorted tasks
    if (sourceIndex < 0 || sourceIndex >= projectTasks.length || destinationIndex < 0 || destinationIndex >= projectTasks.length) {
      console.error("Invalid source or destination index for reorder.");
      return;
    }

    const reorderedTasks = Array.from(projectTasks);
    const [movedTask] = reorderedTasks.splice(sourceIndex, 1);
    reorderedTasks.splice(destinationIndex, 0, movedTask);

    const batch = writeBatch(db);
    reorderedTasks.forEach((task, index) => {
      const taskDocRef = doc(db, 'projects', targetProjectId, 'tasks', task.id);
      batch.update(taskDocRef, { order: index }); // Update order based on new array index
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error(`Error reordering tasks in list for project ${targetProjectId}: `, error);
      throw error;
    }
  }, [getTasksByProjectId]); // getTasksByProjectId is a dependency

  const addCommentToTask = useCallback(async (projectId: string, taskId: string, commentData: CommentData) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    const commentPayloadForFirestore: any = {
      id: crypto.randomUUID(),
      text: commentData.text,
      createdAt: Timestamp.fromDate(new Date()),
    };
    if (commentData.fileURL !== undefined) commentPayloadForFirestore.fileURL = commentData.fileURL;
    if (commentData.fileName !== undefined) commentPayloadForFirestore.fileName = commentData.fileName;

    try {
      await updateDoc(taskDocRef, { comments: arrayUnion(commentPayloadForFirestore) });
    } catch (error) {
      console.error(`Error adding comment to task ${taskId} in project ${projectId}: `, error);
      throw error;
    }
  }, []);

  const updateCommentInTask = useCallback(async (
    projectId: string,
    taskId: string,
    commentId: string,
    updatedCommentData: CommentData
  ) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    try {
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        // Map comments from Firestore (with Timestamps) to local Comment type (with ISO strings)
        let comments = (taskData.comments || []).map((c: any) => ({ 
          id: c.id, text: c.text,
          createdAt: c.createdAt instanceof Timestamp ? c.createdAt.toDate().toISOString() : c.createdAt,
          updatedAt: c.updatedAt instanceof Timestamp ? c.updatedAt.toDate().toISOString() : c.updatedAt,
          fileURL: c.fileURL, fileName: c.fileName,
        })) as Comment[];
        
        const commentIndex = comments.findIndex(c => c.id === commentId);
        if (commentIndex > -1) {
          const oldComment = comments[commentIndex];
          const updatedLocalComment: Comment = {
            ...oldComment, text: updatedCommentData.text,
            fileURL: updatedCommentData.fileURL, fileName: updatedCommentData.fileName,
            updatedAt: Timestamp.fromDate(new Date()).toDate().toISOString(), // Update the timestamp
          };
          comments[commentIndex] = updatedLocalComment;

          // Convert local comments back to Firestore-compatible format (with Timestamps)
          const commentsForFirestore = comments.map(c_local => {
            const firestoreComment: any = {
              id: c_local.id, text: c_local.text,
              createdAt: Timestamp.fromDate(parseISO(c_local.createdAt)), // Convert ISO string back to Timestamp
            };
            if (c_local.updatedAt) firestoreComment.updatedAt = Timestamp.fromDate(parseISO(c_local.updatedAt));
            
            if (c_local.fileURL != null) firestoreComment.fileURL = c_local.fileURL;
            if (c_local.fileName != null) firestoreComment.fileName = c_local.fileName;
            
            return firestoreComment;
          });
          await updateDoc(taskDocRef, { comments: commentsForFirestore });
        } else {
          console.error(`Comment with ID ${commentId} not found in task ${taskId}`);
          throw new Error("Comment not found");
        }
      } else {
        console.error(`Task with ID ${taskId} not found in project ${projectId}`);
        throw new Error("Task not found");
      }
    } catch (error) {
      console.error(`Error updating comment ${commentId} for task ${taskId} in project ${projectId}: `, error);
      throw error;
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects, tasks, theme, isLoading,
        toggleTheme, addProject, updateProject, deleteProject, getProjectById,
        addTask, updateTask, deleteTask, getTasksByProjectId, moveTask, reorderTasksInList,
        addCommentToTask, updateCommentInTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
