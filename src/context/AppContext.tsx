
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
  // where, // No longer needed for top-level tasks query
  getDocs,
  Timestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  getDoc,
  collectionGroup
} from 'firebase/firestore';
import { ref as storageRefFB, deleteObject } from "firebase/storage";

type Theme = 'light' | 'dark';

interface CommentData {
  text: string;
  fileURL?: string;
  fileName?: string;
}

// For updateTask, projectId is not part of the task document data itself
type TaskUpdatableData = Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>;


interface AppContextType {
  projects: Project[];
  tasks: Task[]; // This will hold all tasks from all projects, with projectId re-attached
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
  const [tasks, setTasks] = useState<Task[]>([]); // All tasks from all project subcollections
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
      const loadedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString(),
      } as Project));
      setProjects(loadedProjects);
      // Tasks loading will set isLoading to false once done
    }, (error) => {
      console.error("Error fetching projects: ", error);
      setIsLoading(false); // Set loading to false on error too
    });

    // Use collectionGroup to get all tasks from all projects' subcollections
    const tasksQuery = query(collectionGroup(db, 'tasks'), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const projectId = docSnap.ref.parent.parent!.id; // Extract projectId from path
        return {
          id: docSnap.id,
          projectId: projectId, // Add projectId for client-side use
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          deadline: data.deadline ? (data.deadline as Timestamp).toDate().toISOString() : undefined,
          order: data.order,
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
    const tasksSubcollectionRef = collection(db, 'projects', id, 'tasks');

    try {
      const batch = writeBatch(db);
      const tasksSnapshot = await getDocs(tasksSubcollectionRef);
      const fileDeletionPromises: Promise<void>[] = [];

      console.log(`Project ${id}: Starting deletion. Found ${tasksSnapshot.docs.length} tasks.`);

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
        batch.delete(taskDoc.ref); // Add task deletion to batch
      }

      if (fileDeletionPromises.length > 0) {
        console.log(`Project ${id}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts to settle.`);
        await Promise.allSettled(fileDeletionPromises);
        console.log(`Project ${id}: All attachment deletion attempts for its tasks have been processed.`);
      } else {
        console.log(`Project ${id}: No attachments found to delete for its tasks.`);
      }
      
      batch.delete(projectDocRef); // Add project deletion to batch
      await batch.commit();
      console.log(`Project ${id} and its tasks successfully deleted from Firestore.`);
    } catch (error) {
      console.error(`Error deleting project ${id} and its tasks: `, error);
      throw error;
    }
  }, []);


  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  const addTask = useCallback(async (projectId: string, title: string, description?: string, deadline?: Date, status: TaskStatus = 'To Do'): Promise<Omit<Task, 'projectId'> | null> => {
    // projectId is not stored in the task document itself in the new structure
    const newTaskDocumentData: any = {
      title,
      description: description || "",
      status,
      createdAt: Timestamp.fromDate(new Date()),
      comments: [],
      order: Date.now(),
    };
    if (deadline) {
      newTaskDocumentData.deadline = Timestamp.fromDate(deadline);
    } else {
      newTaskDocumentData.deadline = null;
    }

    try {
      const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
      const docRef = await addDoc(tasksCollectionRef, newTaskDocumentData);
      // Return data without projectId, as it's not part of the stored document
      return {
        id: docRef.id,
        title: newTaskDocumentData.title,
        description: newTaskDocumentData.description,
        status: newTaskDocumentData.status,
        createdAt: newTaskDocumentData.createdAt.toDate().toISOString(),
        deadline: newTaskDocumentData.deadline ? newTaskDocumentData.deadline.toDate().toISOString() : undefined,
        comments: [],
        order: newTaskDocumentData.order,
      };
    } catch (error) {
      console.error("Error adding task to project subcollection: ", error);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (projectId: string, taskId: string, taskUpdates: TaskUpdatableData) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    const updatesToSend: { [key: string]: any } = {};

    // Exclude projectId from updates
    const { projectId: _, ...validTaskUpdates } = taskUpdates as any;


    if (validTaskUpdates.title !== undefined) updatesToSend.title = validTaskUpdates.title;
    if (validTaskUpdates.hasOwnProperty('description')) {
      updatesToSend.description = validTaskUpdates.description || "";
    }
    if (validTaskUpdates.status !== undefined) updatesToSend.status = validTaskUpdates.status;
    
    if (validTaskUpdates.hasOwnProperty('deadline')) {
      if (validTaskUpdates.deadline) {
        let deadLineDate = new Date(validTaskUpdates.deadline);
        updatesToSend.deadline = Timestamp.fromDate(deadLineDate);
      } else if (validTaskUpdates.deadline === null || validTaskUpdates.deadline === undefined) {
        updatesToSend.deadline = null;
      } else if (typeof validTaskUpdates.deadline === 'string') {
        updatesToSend.deadline = Timestamp.fromDate(parseISO(validTaskUpdates.deadline));
      }
    }

    if (validTaskUpdates.order !== undefined) updatesToSend.order = validTaskUpdates.order;
    
    if (validTaskUpdates.comments !== undefined) {
        updatesToSend.comments = validTaskUpdates.comments.map((c: Comment) => {
        let createdAt = Timestamp.fromDate(new Date());
        if (c.createdAt) {
          createdAt = Timestamp.fromDate(parseISO(c.createdAt));
        }
        const firestoreComment: any = {
          id: c.id,
          text: c.text,
          createdAt: createdAt,
        };
        if (c.updatedAt) {
          firestoreComment.updatedAt = Timestamp.fromDate(parseISO(c.updatedAt));
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
      console.error(`Error updating task ${taskId} in project ${projectId}: `, error);
    }
  }, []);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    try {
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
                    }
                  }
                })()
              );
            }
          }
          if (fileDeletionPromises.length > 0) {
            console.log(`Task ${taskId}: Waiting for ${fileDeletionPromises.length} attachment deletion attempts.`);
            await Promise.allSettled(fileDeletionPromises);
            console.log(`Task ${taskId}: Attachment deletion attempts processed.`);
          }
        } else {
          console.log(`Task ${taskId}: No comments with attachments found.`);
        }
      } else {
        console.warn(`Task ${taskId} in Project ${projectId} not found for attachment deletion checks.`);
      }
      await deleteDoc(taskDocRef);
      console.log(`Task ${taskId} successfully deleted from Project ${projectId}.`);
    } catch (error) {
      console.error(`Error deleting task ${taskId} from project ${projectId}: `, error);
      throw error;
    }
  }, []);


  const getTasksByProjectId = useCallback((targetProjectId: string): Task[] => {
    return tasks
      .filter((task) => task.projectId === targetProjectId)
      .sort((a, b) => {
        const orderA = a.order;
        const orderB = b.order;
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [tasks]);

  const moveTask = useCallback(async (projectId: string, taskId: string, newStatus: TaskStatus) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    try {
      await updateDoc(taskDocRef, { status: newStatus });
    } catch (error) {
      console.error(`Error moving task ${taskId} in project ${projectId}: `, error);
    }
  }, []);
  
  const reorderTasksInList = useCallback(async (targetProjectId: string, sourceIndex: number, destinationIndex: number) => {
    const projectTasks = getTasksByProjectId(targetProjectId);
    if (sourceIndex < 0 || sourceIndex >= projectTasks.length || destinationIndex < 0 || destinationIndex >= projectTasks.length) {
      console.error("Invalid source or destination index for reorder.");
      return;
    }

    const reorderedTasks = Array.from(projectTasks);
    const [movedTask] = reorderedTasks.splice(sourceIndex, 1);
    reorderedTasks.splice(destinationIndex, 0, movedTask);

    const batch = writeBatch(db);
    reorderedTasks.forEach((task, index) => {
      const taskDocRef = doc(db, 'projects', targetProjectId, 'tasks', task.id); // Use task.id
      batch.update(taskDocRef, { order: index });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error(`Error reordering tasks in list for project ${targetProjectId}: `, error);
      throw error;
    }
  }, [getTasksByProjectId]);

  const addCommentToTask = useCallback(async (projectId: string, taskId: string, commentData: CommentData) => {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    const commentPayloadForFirestore: {
      id: string; text: string; createdAt: Timestamp; fileURL?: string; fileName?: string;
    } = {
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
            updatedAt: Timestamp.fromDate(new Date()).toDate().toISOString(),
          };
          comments[commentIndex] = updatedLocalComment;

          const commentsForFirestore = comments.map(c_local => {
            const firestoreComment: any = {
              id: c_local.id, text: c_local.text,
              createdAt: Timestamp.fromDate(parseISO(c_local.createdAt)),
            };
            if (c_local.updatedAt) firestoreComment.updatedAt = Timestamp.fromDate(parseISO(c_local.updatedAt));
            if (c_local.fileURL !== undefined) firestoreComment.fileURL = c_local.fileURL;
            if (c_local.fileName !== undefined) firestoreComment.fileName = c_local.fileName;
            return firestoreComment;
          });
          await updateDoc(taskDocRef, { comments: commentsForFirestore });
        } else {
          throw new Error("Comment not found");
        }
      } else {
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
