"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";
import { ArrowRight, Edit3 } from "lucide-react";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { formatDistanceToNow } from 'date-fns';

interface ProjectItemProps {
  project: Project;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const createdAtRelative = project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'N/A';

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{project.name}</CardTitle>
        <CardDescription className="text-sm h-10 overflow-hidden text-ellipsis">
          {project.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground">Created: {createdAtRelative}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4">
        <Link href={`/projects/${project.id}`} passHref>
          <Button variant="outline" size="sm">
            Open Board <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
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
