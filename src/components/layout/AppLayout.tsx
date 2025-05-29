"use client";

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Toaster />
      <footer className="py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} KanbanLite. All rights reserved.
      </footer>
    </div>
  );
}
