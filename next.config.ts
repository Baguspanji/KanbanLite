import type {NextConfig} from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = 'KanbanLite'; // CHANGE THIS IF YOUR GITHUB REPO IS NAMED DIFFERENTLY

const nextConfig: NextConfig = {
  // Apply static export and basePath only for GitHub Pages deployments
  ...(isGitHubPages && {
    output: 'export',
    basePath: `/${repositoryName}`,
    trailingSlash: true,
  }),
  images: {
    // Enable unoptimized images for static export (GitHub Pages)
    ...(isGitHubPages && { unoptimized: true }),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    // Set to false to catch build errors. Was true previously.
    // If your build fails due to new TS errors, you might need to fix them or temporarily set this back to true.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
