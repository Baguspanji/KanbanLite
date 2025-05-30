
export type TaskStatus = 'To Do' | 'On Dev' | 'On QA' | 'Done';

export const TASK_STATUSES: TaskStatus[] = ['To Do', 'On Dev', 'On QA', 'Done'];

export interface Comment {
  id: string;
  text: string;
  createdAt: string; // Store as ISO string
  updatedAt?: string; // Store as ISO string, optional
  fileURL?: string; // URL of the uploaded file in Firebase Storage
  fileName?: string; // Original name of the uploaded file
}

export interface Task {
  id: string;
  // projectId is NOT stored in the task document in Firestore,
  // but added back in AppContext when reading from collectionGroup for client-side use.
  projectId: string; 
  title: string;
  description?: string;
  deadline?: string; // Store as ISO string (e.g., YYYY-MM-DD)
  status: TaskStatus;
  createdAt: string; // Store as ISO string
  comments?: Comment[];
  order?: number; // For manual list ordering
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // Store as ISO string
}
