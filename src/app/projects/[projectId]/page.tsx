
// No "use client" here
import ProjectPageClient from './project-page-client';

// Required for static export of dynamic routes.
// This function should return an array of params for which Next.js should
// pre-render pages at build time. For fully client-rendered dynamic pages
// with output: 'export', returning an empty array is appropriate.
export function generateStaticParams() {
  // In a truly static export scenario where project IDs are known at build time,
  // you would fetch them here. For a dynamic app like a Kanban board,
  // it's common to not pre-render individual project pages if they are numerous
  // or created by users after the build. Returning an empty array means
  // these pages will be client-side rendered when navigated to.
  // For GitHub Pages, direct access to /projects/some-id might 404,
  // but navigation from the home page should work.
  return [];
}

// Explicitly tell Next.js how to handle dynamic segments not covered by generateStaticParams.
// true (default): Allows client-side rendering for segments not pre-rendered.
// This is crucial for 'output: export' when generateStaticParams returns [].
export const dynamicParams = true;

// This Server Component wrapper will render the actual client-side page logic.
export default function ProjectPage() {
  return <ProjectPageClient />;
}
