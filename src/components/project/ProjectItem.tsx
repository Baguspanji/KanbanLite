
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Project, Task } from "@/types";
import { ArrowRight, Edit3 } from "lucide-react";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useState, useEffect } from 'react'; // Added useState, useEffect

interface ProjectItemProps {
  project: Project;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const { getTasksByProjectId } = useAppContext();
  const [hasMounted, setHasMounted] = useState(false); // State to track client-side mount

  useEffect(() => {
    setHasMounted(true); // Set to true after component mounts on client
  }, []);

  const projectTasks = useMemo(() => getTasksByProjectId(project.id), [getTasksByProjectId, project.id]);

  const doneTasksCount = useMemo(() => {
    return projectTasks.filter((task: Task) => task.status === 'Done').length;
  }, [projectTasks]);

  const totalTasksCount = projectTasks.length;
  const progressPercentage = totalTasksCount > 0 ? (doneTasksCount / totalTasksCount) * 100 : 0;
  
  const createdAtRelative = project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'N/A';

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{project.name}</CardTitle>
        <CardDescription className="text-sm h-10 overflow-hidden text-ellipsis">
          {project.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-xs font-semibold text-primary">{Math.round(progressPercentage)}%</p>
          </div>
          <Progress value={progressPercentage} className="h-2" />
           <p className="text-xs text-muted-foreground mt-1">
            {doneTasksCount} of {totalTasksCount} tasks done
          </p>
        </div>
        <p className="text-xs text-muted-foreground pt-2">Created: {createdAtRelative}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4">
        {hasMounted ? ( // Only render the Link component on the client after mount
          <Link href={`/projects/${project.id}`} passHref>
            <Button variant="outline" size="sm">
              Open Board <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          // Render a placeholder or disabled button during SSR/build and pre-hydration
          <Button variant="outline" size="sm" disabled>
            Open Board <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <div className="flex gap-2">
          <CreateProjectDialog 
            project={project} 
            triggerButton={
              <Button variant="ghost" size="icon">
                <Edit3 className="h-4 w-4" />
                <span className="sr-only">Edit Project</span>
              </Button>
            }
          />
          <DeleteProjectDialog project={project} />
        </div>
      </CardFooter>
    </Card>
  );
}
