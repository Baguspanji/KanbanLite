"use client";

import { useAppContext } from "@/context/AppContext";
import { ProjectItem } from "./ProjectItem";
import { FileText } from "lucide-react";

export function ProjectList() {
  const { projects } = useAppContext();

  if (projects.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Projects Yet</h3>
        <p className="text-muted-foreground">Get started by creating your first project.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((project) => (
        <ProjectItem key={project.id} project={project} />
      ))}
    </div>
  );
}
