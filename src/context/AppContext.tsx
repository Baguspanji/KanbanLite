
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { formatISO } from 'date-fns';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, update, remove, get, child } from 'firebase/database';

type Theme = 'light' | 'dark';

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
  addCommentToTask: (taskId: string, commentText: string) => Promise<void>;
  isLoading: boolean; // To indicate data loading state
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

  // Firebase Listeners
  useEffect(() => {
    setIsLoading(true);
    const projectsRef = ref(database, 'projects');
    const unsubscribeProjects = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedProjects = data ? Object.keys(data).map(key => ({ id: key, ...data[key] } as Project)) : [];
      setProjects(loadedProjects);
      if (tasks.length > 0 || !data) setIsLoading(false); // Only set loading to false if tasks also loaded or no projects
    }, (error) => {
      console.error("Error fetching projects: ", error);
      setIsLoading(false);
    });

    const tasksRef = ref(database, 'tasks');
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTasks = data ? Object.keys(data).map(key => ({ id: key, ...data[key] } as Task)) : [];
      setTasks(loadedTasks);
      setIsLoading(false); // Set loading to false after tasks are loaded
    }, (error) => {
      console.error("Error fetching tasks: ", error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, []); // Empty dependency array means this runs once on mount

  const addProject = useCallback(async (name: string, description?: string): Promise<Project | null> => {
    const newProjectRef = push(ref(database, 'projects'));
    const newProject: Omit<Project, 'id'> = {
      name,
      description,
      createdAt: formatISO(new Date()),
    };
    try {
      await set(newProjectRef, newProject);
      return { id: newProjectRef.key!, ...newProject };
    } catch (error) {
      console.error("Error adding project: ", error);
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, name: string, description?: string) => {
    const projectRef = ref(database, `projects/${id}`);
    const updates: Partial<Project> = { name };
    if (description !== undefined) {
      updates.description = description;
    }
    try {
      await update(projectRef, updates);
    } catch (error) {
      console.error("Error updating project: ", error);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    // First, delete all tasks associated with this project
    const tasksToDelete = tasks.filter(task => task.projectId === id);
    const deletePromises: Promise<void>[] = [];
    tasksToDelete.forEach(task => {
      deletePromises.push(remove(ref(database, `tasks/${task.id}`)));
    });

    try {
      await Promise.all(deletePromises);
      // Then, delete the project itself
      await remove(ref(database, `projects/${id}`));
    } catch (error) {
      console.error("Error deleting project and its tasks: ", error);
    }
  }, [tasks]); // Include tasks in dependency array

  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  const addTask = useCallback(async (projectId: string, title: string, description?: string, deadline?: Date, status: TaskStatus = 'To Do'): Promise<Task | null> => {
    const newTaskRef = push(ref(database, 'tasks'));
    const newTaskData: Omit<Task, 'id'> = {
      projectId,
      title,
      description,
      deadline: deadline ? formatISO(deadline, { representation: 'date' }) : undefined,
      status,
      createdAt: formatISO(new Date()),
      comments: [],
    };
    try {
      await set(newTaskRef, newTaskData);
      return { id: newTaskRef.key!, ...newTaskData };
    } catch (error) {
      console.error("Error adding task: ", error);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (id: string, taskUpdates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => {
    const taskRef = ref(database, `tasks/${id}`);
    // Firebase update doesn't play well with `undefined` for direct field removal in a shallow update.
    // We need to construct the update object carefully.
    const updatesToSend: any = { ...taskUpdates };

    if (taskUpdates.deadline === null || taskUpdates.deadline === undefined) {
      updatesToSend.deadline = null; // Explicitly set to null to remove or keep undefined.
    } else if (taskUpdates.deadline instanceof Date) {
      updatesToSend.deadline = formatISO(taskUpdates.deadline, { representation: 'date' });
    }
    // Ensure comments are not accidentally overwritten if not part of updates
    if (taskUpdates.comments === undefined) {
      delete updatesToSend.comments; // Don't send comments if not changing
    }

    try {
      await update(taskRef, updatesToSend);
    } catch (error) {
      console.error("Error updating task: ", error);
    }
  }, []);
  
  const deleteTask = useCallback(async (id: string) => {
    try {
      await remove(ref(database, `tasks/${id}`));
    } catch (error) {
      console.error("Error deleting task: ", error);
    }
  }, []);

  const getTasksByProjectId = useCallback((projectId: string): Task[] => {
    return tasks.filter((task) => task.projectId === projectId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [tasks]);
  
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const taskRef = ref(database, `tasks/${taskId}`);
    try {
      await update(taskRef, { status: newStatus });
    } catch (error) {
      console.error("Error moving task: ", error);
    }
  }, []);

  const addCommentToTask = useCallback(async (taskId: string, commentText: string) => {
    const taskRef = ref(database, `tasks/${taskId}`);
    try {
      const snapshot = await get(child(taskRef, 'comments'));
      const existingComments: Comment[] = snapshot.val() || [];
      
      const newComment: Comment = {
        id: crypto.randomUUID(), // Client-side generated ID for comments
        text: commentText,
        createdAt: formatISO(new Date()),
      };
      const updatedComments = [...existingComments, newComment];
      await update(taskRef, { comments: updatedComments });
    } catch (error) {
      console.error("Error adding comment: ", error);
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
