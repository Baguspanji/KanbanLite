
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
import { TaskListComponent } from '@/components/task/TaskList';
import { TaskListSkeleton } from '@/components/task/TaskListSkeleton';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useLocalStorage from '@/hooks/useLocalStorage';

export const dynamic = 'force-dynamic';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById, projects, isLoading: contextIsLoading } = useAppContext();
  const [project, setProject] = useState<Project | undefined | null>(undefined);
  
  const projectId = params.projectId as string;
  
  // Use localStorage for viewMode, specific to this project
  const [viewMode, setViewMode] = useLocalStorage<'kanban' | 'list'>(
    `kanbanlite-viewmode-${projectId}`, 
    'kanban'
  );

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null);
    } else if (projectId && !contextIsLoading && projects.length === 0) {
      // This case handles when context is done loading but no projects were found (or not this one)
      setProject(null);
    }
    // If contextIsLoading is true, project remains undefined, showing the skeleton.
  }, [projectId, getProjectById, projects, contextIsLoading]);

  const handleProjectDeleted = () => {
    router.push('/');
  };

  if (project === undefined) { // Still determining if project exists or context is loading
    return (
      <div className="space-y-6">
        {/* Row 1: Project Info Skeletons + Edit/Delete Skeletons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Project Info Skeletons */}
          <div className="flex-grow">
            <Skeleton className="h-8 w-1/4 mb-2" /> {/* Back Button placeholder */}
            <Skeleton className="h-10 w-3/4 mb-1" /> {/* Project Name */}
            <Skeleton className="h-5 w-full mb-4" /> {/* Project Description */}
          </div>
          {/* Edit/Delete Project Skeletons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
            <Skeleton className="h-10 w-32" /> {/* Edit Project button placeholder */}
            <Skeleton className="h-10 w-36" /> {/* Delete Project button placeholder */}
          </div>
        </div>

        {/* Row 2: View Toggle and Add Task Skeletons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-3 pt-2 border-t border-border/50 mt-4">
          <Skeleton className="h-10 w-[150px] sm:w-40" /> {/* View Toggle Placeholder */}
          <Skeleton className="h-10 w-32" /> {/* Add Task button placeholder */}
        </div>
        
        {/* Content Skeletons based on default viewMode (or persisted viewMode if available before skeleton shows) */}
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
  
  if (project === null && !contextIsLoading) { // Context done loading, project confirmed not found
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

  // Type guard to ensure project is not null
  if (!project) {
    return null; // This should never happen due to the logic above, but satisfies TypeScript
  }

  // Project is loaded
  return (
    <div className="space-y-6">
      {/* Main Header Area */}
      <div className="space-y-4">

        {/* Row 1: Project Info (Left) vs Edit/Delete (Right) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Left Side: Project Info (Back Button, Title, Description) */}
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
          
          {/* Right Side: Edit/Delete Project Buttons */}
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

        {/* Row 2: View Toggle & Add Task Button (Now under Project Info) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-3 pt-3 border-t border-border/50 mt-3">
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
              <Button variant="outline" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            }
          />
        </div>
      </div>
      
      {/* Content Area based on viewMode */}
      {viewMode === 'kanban' ? (
        <KanbanBoard projectId={projectId} />
      ) : (
        <TaskListComponent projectId={projectId} />
      )}
    </div>
  );
}
