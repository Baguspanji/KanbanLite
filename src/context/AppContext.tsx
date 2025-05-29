
"use client";

import type { Project, Task, TaskStatus, Comment } from '@/types'; // Added Comment
import React, { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { formatISO } from 'date-fns';

interface AppContextType {
  projects: Project[];
  tasks: Task[];
  addProject: (name: string, description?: string) => Project;
  updateProject: (id: string, name: string, description?: string) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  addTask: (projectId: string, title: string, description?: string, deadline?: Date, status?: TaskStatus) => Task;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  getTasksByProjectId: (projectId: string) => Task[];
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  addCommentToTask: (taskId: string, commentText: string) => void; // Added this line
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('kanbanlite-projects', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('kanbanlite-tasks', []);

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
    setTasks((prevTasks) => prevTasks.filter((t) => t.projectId !== id)); // Also delete associated tasks
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
      comments: [], // Initialize comments array
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
          // Ensure comments are preserved if not part of updates
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
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        addTask,
        updateTask,
        deleteTask,
        getTasksByProjectId,
        moveTask,
        addCommentToTask, // Added this
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
