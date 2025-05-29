
export type TaskStatus = 'To Do' | 'On Dev' | 'On QA' | 'Done';

export const TASK_STATUSES: TaskStatus[] = ['To Do', 'On Dev', 'On QA', 'Done'];

export interface Comment {
  id: string;
  text: string;
  createdAt: string; // Store as ISO string
  fileURL?: string; // URL of the uploaded file in Firebase Storage
  fileName?: string; // Original name of the uploaded file
  // Future: userId?: string; userName?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // Store as ISO string (e.g., YYYY-MM-DD)
  status: TaskStatus;
  projectId: string;
  createdAt: string; // Store as ISO string
  comments?: Comment[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // Store as ISO string
}
