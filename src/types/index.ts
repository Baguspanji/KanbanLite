export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export const TASK_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // Store as ISO string (e.g., YYYY-MM-DD)
  status: TaskStatus;
  projectId: string;
  createdAt: string; // Store as ISO string
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // Store as ISO string
}
