
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { formatISO, parseISO } from 'date-fns';
import { db } from '@/lib/firebase';
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
  arrayUnion
} from 'firebase/firestore';

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
      setIsLoading(false);
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
            // Ensure comment.createdAt is handled correctly, might be already string or Timestamp from Firestore
            createdAt: comment.createdAt instanceof Timestamp 
                        ? comment.createdAt.toDate().toISOString() 
                        : (typeof comment.createdAt === 'string' ? comment.createdAt : new Date().toISOString()),
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
    const updates: Partial<Project> = { name };
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
      tasksSnapshot.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
      });
      batch.delete(projectDocRef);
      await batch.commit();
    } catch (error) {
      console.error("Error deleting project and its tasks: ", error);
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
      } else if (taskUpdates.deadline === null) {
        updatesToSend.deadline = null; 
      } else if (typeof taskUpdates.deadline === 'string') {
         updatesToSend.deadline = Timestamp.fromDate(parseISO(taskUpdates.deadline));
      }
    }
    
    if (taskUpdates.comments !== undefined) {
       updatesToSend.comments = taskUpdates.comments.map(c => ({
        ...c,
        createdAt: c.createdAt instanceof Timestamp ? c.createdAt : Timestamp.fromDate(parseISO(c.createdAt)) 
      }));
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
      await deleteDoc(taskDocRef);
    } catch (error) {
      console.error("Error deleting task: ", error);
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
    const newComment: Partial<Comment> & {createdAt: Timestamp} = {
      id: crypto.randomUUID(),
      text: commentData.text,
      createdAt: Timestamp.fromDate(new Date()),
    };

    if (commentData.fileURL) {
      newComment.fileURL = commentData.fileURL;
    }
    if (commentData.fileName) {
      newComment.fileName = commentData.fileName;
    }

    try {
      await updateDoc(taskDocRef, {
        comments: arrayUnion(newComment)
      });
    } catch (error) {
      console.error("Error adding comment: ", error);
      throw error; // Re-throw to be caught by the calling component
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
