
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getProjectById, projects, isLoading: contextIsLoading } = useAppContext();
  const [project, setProject] = useState<Project | undefined | null>(undefined);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId && projects.length > 0) { // Ensure projects are loaded before trying to find one
      const foundProject = getProjectById(projectId);
      setProject(foundProject || null);
    } else if (projectId && !contextIsLoading && projects.length === 0) {
      // Edge case: context done loading, projects is empty, so project not found
      setProject(null);
    }
    // If contextIsLoading is true, project remains undefined, letting skeleton show
  }, [projectId, getProjectById, projects, contextIsLoading]);

  const handleProjectDeleted = () => {
    router.push('/');
  };

  // Show skeleton if project details are not yet determined (project is undefined)
  // This covers the initial phase where context might be loading or useEffect hasn't set the project yet.
  if (project === undefined) {
    return (
      <div className="space-y-6">
        {/* Project Info Skeletons */}
        <div className="flex-grow">
            <Skeleton className="h-8 w-1/4 mb-2" /> {/* Back Button placeholder */}
            <Skeleton className="h-10 w-3/4 mb-1" /> {/* Project Name */}
            <Skeleton className="h-5 w-full mb-4" /> {/* Project Description */}
        </div>
        
        {/* Right Aligned Controls Skeleton */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
            <Skeleton className="h-10 w-[150px] sm:w-40" /> {/* View Toggle Placeholder */}
            <Skeleton className="h-10 w-32" /> {/* Add Task button placeholder */}
            <Skeleton className="h-10 w-32" /> {/* Edit Project button placeholder */}
            <Skeleton className="h-10 w-36" /> {/* Delete Project button placeholder */}
        </div>
        
        {/* Content Skeletons based on default viewMode */}
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
  
  // Show "Project Not Found" if project is null (meaning lookup failed) AND context is no longer loading.
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

  // If project is null but contextIsLoading is still true, project === undefined case handles it.
  // If we reach here, project must be a valid Project object.

  return (
    <div className="space-y-6">
      {/* Main Header Row: Project Info (Left) and Controls (Right) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left Side: Project Info & Back Button */}
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
        
        {/* Right Side: Controls (Toggle Group + Action Buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto self-start sm:self-center md:self-center mt-4 md:mt-0 flex-shrink-0">
          {/* View Toggle Group */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => { if (value) setViewMode(value as 'kanban' | 'list'); }}
            className="border bg-background rounded-md p-1 flex-shrink-0"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-2.5 sm:px-3">
              <LayoutGrid className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-2.5 sm:px-3">
              <ListFilter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Action Buttons */}
           <CreateTaskDialog
            projectId={projectId}
            defaultStatus="To Do" 
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
      
      {/* Content Area based on viewMode */}
      {/* KanbanBoard and TaskListComponent will handle their own internal loading state based on AppContext.isLoading */}
      {viewMode === 'kanban' ? (
        <KanbanBoard projectId={projectId} />
      ) : (
        <TaskListComponent projectId={projectId} />
      )}
    </div>
  );
}
