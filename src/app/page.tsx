
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen pb-64 space-y-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome to KanbanLite</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        A simple and intuitive Kanban board application to help you manage your projects and tasks efficiently.
      </p>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/projects">
          Get Started with Your First Project
        </Link>
      </Button>
    </div>
  );
}
