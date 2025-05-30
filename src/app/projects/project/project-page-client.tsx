"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutGrid, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import type { Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/project/DeleteProjectDialog';
import { TaskListComponent } from '@/components/task/TaskList';
import { TaskListSkeleton } from '@/components/task/TaskListSkeleton';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useLocalStorage from '@/hooks/useLocalStorage';

function ProjectPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { getProjectById, projects, isLoading: contextIsLoading } = useAppContext();
  const [project, setProject] = useState<Project | undefined | null>(undefined);
  
  const projectId = params.get('projectId') || '';
  
  const [viewMode, setViewMode] = useLocalStorage<'kanban' | 'list'>(
    `kanbanlite-viewmode-${projectId}`, 
    'kanban'
  );

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null);
    } else if (projectId && !contextIsLoading && projects.length === 0) {
      // If context is done loading and projects array is empty, project not found
      setProject(null);
    }
    // If projectId is present but projects are still loading (contextIsLoading is true),
    // project state remains `undefined` which shows the main skeleton.
  }, [projectId, getProjectById, projects, contextIsLoading]);

  const handleProjectDeleted = () => {
    router.push('/');
  };

  if (project === undefined) { 
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-grow">
            <Skeleton className="h-8 w-1/4 mb-2" /> 
            <Skeleton className="h-10 w-3/4 mb-1" /> 
            <Skeleton className="h-5 w-full mb-4" /> 
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
            <Skeleton className="h-10 w-32" /> 
            <Skeleton className="h-10 w-36" /> 
          </div>
        </div>
        
        <div className="flex flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 mt-3">
            <Skeleton className="h-10 w-[150px] sm:w-40 px-4" />
            <Skeleton className="h-10 w-32" />
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
  
  if (project === null && !contextIsLoading) { 
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

  if (!project) {
    // This case should ideally not be reached if above conditions handle undefined/null correctly based on loading state.
    // It acts as a fallback.
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
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
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
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

        <div className="flex flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 mt-3">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => { if (value) setViewMode(value as 'kanban' | 'list'); }}
            className="border bg-background rounded-md p-1 flex-shrink-0"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4 h-[2rem]">
              <LayoutGrid className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4 h-[2rem]">
              <ListFilter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <CreateTaskDialog
            projectId={projectId}
            defaultStatus="To Do" 
            triggerButton={
              <Button variant="outline" className="w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            }
          />
        </div>
      </div>
      
      {viewMode === 'kanban' ? (
        <KanbanBoard projectId={projectId} />
      ) : (
        <TaskListComponent projectId={projectId} />
      )}
    </div>
  );
}

export default function ProjectPageClient() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-grow">
            <Skeleton className="h-8 w-1/4 mb-2" /> 
            <Skeleton className="h-10 w-3/4 mb-1" /> 
            <Skeleton className="h-5 w-full mb-4" /> 
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
            <Skeleton className="h-10 w-32" /> 
            <Skeleton className="h-10 w-36" /> 
          </div>
        </div>
        
        <div className="flex flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 mt-3">
            <Skeleton className="h-10 w-[150px] sm:w-40 px-4" />
            <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="flex gap-6 pb-4 overflow-x-auto">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px] w-[320px] min-w-[300px] flex-shrink-0 rounded-lg" />)}
        </div>
      </div>
    }>
      <ProjectPageContent />
    </Suspense>
  );
}
