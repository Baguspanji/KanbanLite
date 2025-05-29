"use client";

import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Projects</h1>
        <CreateProjectDialog 
          triggerButton={
            <Button size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Project
            </Button>
          }
        />
      </div>
      <ProjectList />
    </div>
  );
}
