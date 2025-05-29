
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react'; // Added useState, useEffect
import useLocalStorage from '@/hooks/useLocalStorage';
import { formatISO } from 'date-fns';

type Theme = 'light' | 'dark'; // Added Theme type

interface AppContextType {
  projects: Project[];
  tasks: Task[];
  theme: Theme; // Added theme
  toggleTheme: () => void; // Added toggleTheme
  addProject: (name: string, description?: string) => Project;
  updateProject: (id: string, name: string, description?: string) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  addTask: (projectId: string, title: string, description?: string, deadline?: Date, status?: TaskStatus) => Task;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  getTasksByProjectId: (projectId: string) => Task[];
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  addCommentToTask: (taskId: string, commentText: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('kanbanlite-projects', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('kanbanlite-tasks', []);
  const [theme, setTheme] = useLocalStorage<Theme>('kanbanlite-theme', 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const generateId = () => crypto.randomUUID();

  const addProject = (name: string, description?: string): Project => {
    const newProject: Project = {
      id: generateId(),
      name,
      description,
      createdAt: formatISO(new Date()),
    };
    setProjects((prevProjects) => [...prevProjects, newProject]);
    return newProject;
  };

  const updateProject = (id: string, name: string, description?: string) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === id ? { ...p, name, description: description ?? p.description } : p))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id));
    setTasks((prevTasks) => prevTasks.filter((t) => t.projectId !== id));
  };

  const getProjectById = (id: string): Project | undefined => {
    return projects.find((p) => p.id === id);
  };

  const addTask = (projectId: string, title: string, description?: string, deadline?: Date, status: TaskStatus = 'To Do'): Task => {
    const newTask: Task = {
      id: generateId(),
      projectId,
      title,
      description,
      deadline: deadline ? formatISO(deadline, { representation: 'date' }) : undefined,
      status,
      createdAt: formatISO(new Date()),
      comments: [],
    };
    setTasks((prevTasks) => [...prevTasks, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === id) {
          const updatedTask = { ...task, ...updates };
          if (updates.deadline === null) { 
            updatedTask.deadline = undefined;
          } else if (updates.deadline instanceof Date) {
            updatedTask.deadline = formatISO(updates.deadline, { representation: 'date' });
          }
          if (!updates.comments && task.comments) {
            updatedTask.comments = task.comments;
          }
          return updatedTask;
        }
        return task;
      })
    );
  };
  
  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const getTasksByProjectId = (projectId: string): Task[] => {
    return tasks.filter((task) => task.projectId === projectId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };
  
  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  const addCommentToTask = (taskId: string, commentText: string) => {
    const newComment: Comment = {
      id: generateId(),
      text: commentText,
      createdAt: formatISO(new Date()),
    };
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId
          ? { ...t, comments: [...(t.comments || []), newComment] }
          : t
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        tasks,
        theme,
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
