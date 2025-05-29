
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutGrid, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/project/DeleteProjectDialog';
import { TaskListComponent } from '@/components/task/TaskList'; // New import
import { TaskListSkeleton } from '@/components/task/TaskListSkeleton'; // New import
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById, projects, isLoading: contextIsLoading } = useAppContext();
  const [project, setProject] = useState<Project | undefined | null>(undefined);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId) {
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null);
    }
  }, [projectId, getProjectById, projects]);

  const handleProjectDeleted = () => {
    router.push('/');
  };

  const isLoading = contextIsLoading || project === undefined;

  if (isLoading && project === undefined) { // Initial loading state for project details
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-3/4" /> {/* Project Name */}
        <Skeleton className="h-6 w-full" /> {/* Project Description */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-24" /> {/* View toggle placeholder */}
          <Skeleton className="h-10 w-36" /> {/* Add Task button placeholder */}
        </div>
        {/* Placeholder for content based on viewMode can be added here if needed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (project === null && !contextIsLoading) { // Project not found after loading finished
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
  
  // If project is defined, or still loading but project is not undefined (meaning context is still loading tasks/etc)
  if (!project && isLoading) {
     // If project data is not yet available but context is loading, show project info skeletons + view skeletons
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-3/4 mb-1" />
        <Skeleton className="h-5 w-full mb-4" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <Skeleton className="h-10 w-40" /> {/* View Toggle */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <Skeleton className="h-10 w-32" /> {/* Add Task */}
             <Skeleton className="h-10 w-32" /> {/* Edit Project */}
             <Skeleton className="h-10 w-36" /> {/* Delete Project */}
          </div>
        </div>
        {viewMode === 'kanban' ? (
            <div className="flex gap-6 pb-4 overflow-x-auto">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px] w-[320px] min-w-[300px] flex-shrink-0 rounded-lg" />)}
            </div>
        ) : (
          <TaskListSkeleton />
        )}
      </div>
    );
  }

  if (!project) { // Should ideally be covered by the null check above, but as a fallback
    return <div>Loading project details or project not found...</div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-grow">
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 sm:-ml-2">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground break-words">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1 max-w-2xl break-words">{project.description}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-auto mt-4 md:mt-0 flex-shrink-0">
           <CreateTaskDialog
            projectId={projectId}
            defaultStatus="To Do" // Default for general add task button
            triggerButton={
              <Button variant="outline" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            }
          />
          <CreateProjectDialog
            project={project}
            triggerButton={
              <Button variant="outline" className="w-full sm:w-auto">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Project
              </Button>
            }
          />
           <DeleteProjectDialog project={project} onDeleted={handleProjectDeleted} triggerButton={
             <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Project
              </Button>
           } />
        </div>
      </div>

      <div className="flex justify-start items-center gap-2 mb-6">
         <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => { if (value) setViewMode(value as 'kanban' | 'list'); }}
            className="border bg-background rounded-md p-1"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <LayoutGrid className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <ListFilter className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
      </div>
      
      {isLoading && (viewMode === 'kanban') && <KanbanBoard projectId={projectId} />} 
      {isLoading && (viewMode === 'list') && <TaskListSkeleton />} 

      {!isLoading && viewMode === 'kanban' && <KanbanBoard projectId={projectId} />}
      {!isLoading && viewMode === 'list' && <TaskListComponent projectId={projectId} />}
    </div>
  );
}

