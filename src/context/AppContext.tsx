
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { formatISO, parseISO } from 'date-fns';
import { db, storage } from '@/lib/firebase'; // Ensure storage is imported
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { ref as storageRefFB, deleteObject } from "firebase/storage"; // Renamed to avoid conflict with local storageRef

type Theme = 'light' | 'dark';

interface CommentData {
  text: string;
  fileURL?: string;
  fileName?: string;
}

interface AppContextType {
  projects: Project[];
  tasks: Task[];
  theme: Theme;
  toggleTheme: () => void;
  addProject: (name: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, name: string, description?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  addTask: (projectId: string, title: string, description?: string, deadline?: Date, status?: TaskStatus) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByProjectId: (projectId: string) => Task[];
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  addCommentToTask: (taskId: string, commentData: CommentData) => Promise<void>;
  updateCommentInTask: (taskId: string, commentId: string, updatedCommentData: CommentData) => Promise<void>;
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
    const tasksCollectionRef = collection(db, 'tasks');

    const qProjects = query(projectsCollectionRef, orderBy('createdAt', 'desc'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const loadedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString(),
      } as Project));
      setProjects(loadedProjects);
    }, (error) => {
      console.error("Error fetching projects: ", error);
    });

    const qTasks = query(tasksCollectionRef, orderBy('createdAt', 'asc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const loadedTasks = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          deadline: data.deadline ? (data.deadline as Timestamp).toDate().toISOString() : undefined,
          comments: (data.comments || []).map((comment: any) => ({
            ...comment,
            createdAt: comment.createdAt instanceof Timestamp
                        ? comment.createdAt.toDate().toISOString()
                        : (typeof comment.createdAt === 'string' ? comment.createdAt : new Date().toISOString()),
            updatedAt: comment.updatedAt instanceof Timestamp
                        ? comment.updatedAt.toDate().toISOString()
                        : (typeof comment.updatedAt === 'string' ? comment.updatedAt : undefined),
          })),
        } as Task;
      });
      setTasks(loadedTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tasks: ", error);
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
    const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', id));

    try {
      const batch = writeBatch(db);
      const tasksSnapshot = await getDocs(tasksQuery);

      const fileDeletionPromises: Promise<void>[] = [];

      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data(); 
        if (taskData.comments && Array.isArray(taskData.comments)) {
          for (const comment of taskData.comments) {
            if (comment.fileURL && typeof comment.fileURL === 'string') {
              fileDeletionPromises.push(
                (async () => {
                  console.log(`Project ${id}, Task ${taskDoc.id}: Attempting to delete attachment ${comment.fileURL}`);
                  try {
                    const fileRef = storageRefFB(storage, comment.fileURL);
                    await deleteObject(fileRef);
                  } catch (err) {
                    // Log error but continue, as failure to delete one file shouldn't block project deletion
                    console.error(`Project ${id}, Task ${taskDoc.id}: Error deleting attachment ${comment.fileURL}:`, err);
                  }
                })()
              );
            }
          }
        }
        batch.delete(taskDoc.ref); 
      }
      
      if (fileDeletionPromises.length > 0) {
        console.log(`Project ${id}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts to settle.`);
        await Promise.allSettled(fileDeletionPromises);
        console.log(`Project ${id}: All attachment deletion attempts for its tasks have been processed.`);
      }
      
      batch.delete(projectDocRef); 
      await batch.commit(); 
      console.log(`Project ${id} and its tasks successfully deleted.`);
    } catch (error) {
      console.error(`Error deleting project ${id} and its tasks: `, error);
      // Re-throw or handle as appropriate for UI feedback
      throw error;
    }
  }, []);

  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  const addTask = useCallback(async (projectId: string, title: string, description?: string, deadline?: Date, status: TaskStatus = 'To Do'): Promise<Task | null> => {
    const newTaskData = {
      projectId,
      title,
      description: description || "",
      deadline: deadline ? Timestamp.fromDate(deadline) : null,
      status,
      createdAt: Timestamp.fromDate(new Date()),
      comments: [],
    };
    try {
      const docRef = await addDoc(collection(db, 'tasks'), newTaskData);
      return {
        id: docRef.id,
        ...newTaskData,
        createdAt: newTaskData.createdAt.toDate().toISOString(),
        deadline: newTaskData.deadline ? newTaskData.deadline.toDate().toISOString() : undefined,
      };
    } catch (error) {
      console.error("Error adding task: ", error);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (id: string, taskUpdates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => {
    const taskDocRef = doc(db, 'tasks', id);
    const updatesToSend: { [key: string]: any } = {};

    if (taskUpdates.title !== undefined) updatesToSend.title = taskUpdates.title;

    if (taskUpdates.hasOwnProperty('description')) {
      updatesToSend.description = taskUpdates.description || "";
    }

    if (taskUpdates.status !== undefined) updatesToSend.status = taskUpdates.status;

    if (taskUpdates.hasOwnProperty('deadline')) {
      if (taskUpdates.deadline instanceof Date) {
        updatesToSend.deadline = Timestamp.fromDate(taskUpdates.deadline);
      } else if (taskUpdates.deadline === null || taskUpdates.deadline === undefined) {
        updatesToSend.deadline = null;
      } else if (typeof taskUpdates.deadline === 'string') {
         updatesToSend.deadline = Timestamp.fromDate(parseISO(taskUpdates.deadline));
      }
    }

    if (taskUpdates.comments !== undefined) {
       updatesToSend.comments = taskUpdates.comments.map(c => {
        const firestoreComment: any = {
          id: c.id,
          text: c.text,
          createdAt: c.createdAt instanceof Timestamp ? c.createdAt : Timestamp.fromDate(parseISO(c.createdAt)),
        };
        if (c.updatedAt) {
          firestoreComment.updatedAt = c.updatedAt instanceof Timestamp ? c.updatedAt : Timestamp.fromDate(parseISO(c.updatedAt));
        }
        if (c.fileURL !== undefined) {
          firestoreComment.fileURL = c.fileURL;
        }
        if (c.fileName !== undefined) {
          firestoreComment.fileName = c.fileName;
        }
        return firestoreComment;
      });
    }

    if (Object.keys(updatesToSend).length === 0) return;

    try {
      await updateDoc(taskDocRef, updatesToSend);
    } catch (error) {
      console.error("Error updating task: ", error);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const taskDocRef = doc(db, 'tasks', id);
    try {
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data(); // Firestore DocumentData, not local Task type
        // Ensure comments is an array and has items before processing
        if (taskData.comments && Array.isArray(taskData.comments) && taskData.comments.length > 0) {
          const fileDeletionPromises: Promise<void>[] = [];
          console.log(`Task ${id}: Preparing to delete attachments for ${taskData.comments.length} comment(s).`);
          for (const comment of taskData.comments) {
            if (comment.fileURL && typeof comment.fileURL === 'string') {
               fileDeletionPromises.push(
                (async () => {
                  console.log(`Task ${id}: Attempting to delete attachment ${comment.fileURL}`);
                  try {
                    const fileRef = storageRefFB(storage, comment.fileURL);
                    await deleteObject(fileRef);
                    console.log(`Task ${id}: Successfully deleted attachment ${comment.fileURL}`);
                  } catch (err: any) {
                    // Log specific Firebase Storage errors if possible
                    if (err.code === 'storage/object-not-found') {
                      console.warn(`Task ${id}: Attachment ${comment.fileURL} not found in Firebase Storage. Skipping deletion.`);
                    } else {
                      console.error(`Task ${id}: Error deleting attachment ${comment.fileURL}:`, err);
                    }
                  }
                })()
              );
            }
          }
          if (fileDeletionPromises.length > 0) {
            console.log(`Task ${id}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts to settle.`);
            await Promise.allSettled(fileDeletionPromises);
            console.log(`Task ${id}: All attachment deletion attempts have been processed.`);
          }
        } else {
          console.log(`Task ${id}: No comments with attachments found or comments array is empty.`);
        }
      } else {
        console.warn(`Task ${id} not found for attachment deletion checks.`);
      }
      await deleteDoc(taskDocRef);
      console.log(`Task ${id} successfully deleted from Firestore.`);
    } catch (error) {
      console.error(`Error deleting task ${id}: `, error);
      throw error;
    }
  }, []);

  const getTasksByProjectId = useCallback((projectId: string): Task[] => {
    return tasks.filter((task) => task.projectId === projectId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [tasks]);

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const taskDocRef = doc(db, 'tasks', taskId);
    try {
      await updateDoc(taskDocRef, { status: newStatus });
    } catch (error) {
      console.error("Error moving task: ", error);
    }
  }, []);

  const addCommentToTask = useCallback(async (taskId: string, commentData: CommentData) => {
    const taskDocRef = doc(db, 'tasks', taskId);
    
    // Construct the comment object for Firestore, ensuring no undefined fields
    const commentPayloadForFirestore: {
      id: string;
      text: string;
      createdAt: Timestamp;
      fileURL?: string;
      fileName?: string;
    } = {
      id: crypto.randomUUID(),
      text: commentData.text,
      createdAt: Timestamp.fromDate(new Date()), // Use server timestamp for createdAt
    };

    if (commentData.fileURL !== undefined) {
      commentPayloadForFirestore.fileURL = commentData.fileURL;
    }
    if (commentData.fileName !== undefined) {
      commentPayloadForFirestore.fileName = commentData.fileName;
    }

    try {
      await updateDoc(taskDocRef, {
        comments: arrayUnion(commentPayloadForFirestore)
      });
    } catch (error) {
      console.error("Error adding comment: ", error);
      throw error;
    }
  }, []);

  const updateCommentInTask = useCallback(async (
    taskId: string,
    commentId: string,
    updatedCommentData: CommentData
  ) => {
    const taskDocRef = doc(db, 'tasks', taskId);
    try {
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        // Map Firestore comment data to local Comment structure (with string dates)
        let comments = (taskData.comments || []).map((c: any) => ({ 
          id: c.id,
          text: c.text,
          createdAt: c.createdAt instanceof Timestamp ? c.createdAt.toDate().toISOString() : c.createdAt,
          updatedAt: c.updatedAt instanceof Timestamp ? c.updatedAt.toDate().toISOString() : c.updatedAt,
          fileURL: c.fileURL,
          fileName: c.fileName,
        })) as Comment[];
        
        const commentIndex = comments.findIndex(c => c.id === commentId);

        if (commentIndex > -1) {
          const oldComment = comments[commentIndex];
          
          // Create the updated local comment object
          const updatedLocalComment: Comment = {
            ...oldComment,
            text: updatedCommentData.text,
            fileURL: updatedCommentData.fileURL, // This can be undefined if removed
            fileName: updatedCommentData.fileName, // This can be undefined if removed
            updatedAt: Timestamp.fromDate(new Date()).toDate().toISOString(),
          };
          
          comments[commentIndex] = updatedLocalComment;

          // Convert the entire comments array back to Firestore format,
          // carefully omitting undefined optional fields.
          const commentsForFirestore = comments.map(c_local => {
            const firestoreComment: any = {
              id: c_local.id,
              text: c_local.text,
              createdAt: Timestamp.fromDate(parseISO(c_local.createdAt)),
            };
            if (c_local.updatedAt) { 
              firestoreComment.updatedAt = Timestamp.fromDate(parseISO(c_local.updatedAt));
            }
            if (c_local.fileURL !== undefined) { 
              firestoreComment.fileURL = c_local.fileURL;
            }
            if (c_local.fileName !== undefined) { 
              firestoreComment.fileName = c_local.fileName;
            }
            return firestoreComment;
          });

          await updateDoc(taskDocRef, { comments: commentsForFirestore });
        } else {
          console.error("Comment not found for update:", commentId);
          throw new Error("Comment not found");
        }
      } else {
        console.error("Task not found for updating comment:", taskId);
        throw new Error("Task not found");
      }
    } catch (error) {
      console.error("Error updating comment: ", error);
      throw error;
    }
  }, []);


  return (
    <AppContext.Provider
      value={{
        projects,
        tasks,
        theme,
        isLoading,
        toggleTheme,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        addTask,
        updateTask,
        deleteTask,
        getTasksByProjectId,
        moveTask,
        addCommentToTask,
        updateCommentInTask,
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

