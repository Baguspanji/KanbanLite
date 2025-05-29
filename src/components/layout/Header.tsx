"use client";

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <LayoutDashboard className="h-7 w-7" />
          <span>KanbanLite</span>
        </Link>
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
}
