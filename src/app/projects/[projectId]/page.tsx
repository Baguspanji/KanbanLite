"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { ArrowLeft, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/project/DeleteProjectDialog';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById, projects } = useAppContext(); // Access projects to trigger re-render on delete
  const [project, setProject] = useState<Project | undefined | null>(undefined); // undefined: loading, null: not found

  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId) {
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null); // Set to null if not found after trying
    }
  }, [projectId, getProjectById, projects]); // Depend on projects to re-check if project was deleted

  if (project === undefined) { // Loading state
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (project === null) { // Project not found
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Project Not Found</h2>
        <p className="text-muted-foreground mb-6">The project you are looking for does not exist or may have been deleted.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Projects
          </Link>
        </Button>
      </div>
    );
  }
  
  const handleProjectDeleted = () => {
    router.push('/'); // Navigate to home if project is deleted
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <CreateProjectDialog
            project={project}
            triggerButton={
              <Button variant="outline">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Project
              </Button>
            }
          />
           <DeleteProjectDialog project={project} onDeleted={handleProjectDeleted} />
        </div>
      </div>
      
      <KanbanBoard projectId={projectId} />
    </div>
  );
}
