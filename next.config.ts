import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration optimisée pour Vercel
  experimental: {
    // Optimisations de performance
    optimizePackageImports: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
  },
  
  // Configuration pour les packages externes server-side
  serverExternalPackages: ['puppeteer'],
  
  // Configuration des images pour Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Configuration des headers de sécurité
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Configuration pour les redirections
  redirects: async () => {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/analysis/roles',
        permanent: true,
      },
    ];
  },
  
  // Optimisation du bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Configuration ESLint pour le déploiement
  eslint: {
    // Ignorer les erreurs ESLint pendant le build pour Vercel
    ignoreDuringBuilds: true,
  },
  
  // Configuration TypeScript pour le déploiement
  typescript: {
    // Ignorer les erreurs TypeScript pendant le build pour Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
