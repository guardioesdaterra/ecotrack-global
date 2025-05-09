const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep strict mode enabled for better development
  reactStrictMode: true,
  
  // Image optimization configuration
  images: {
    domains: [
      'images.unsplash.com',
      'uploadthing.com',
      'utfs.io',
      'a.tile.openstreetmap.org',
      'b.tile.openstreetmap.org',
      'c.tile.openstreetmap.org',
      'lh3.googleusercontent.com',
      'oqzuskgsgufbntufufcz.supabase.co',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Enable proper caching for optimized images
    minimumCacheTTL: 60,
  },
  
  // Re-enable proper error checking
  eslint: {
    // Enable ESLint during builds for better reliability
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'contexts', 'hooks', 'lib', 'utils'],
  },
  
  typescript: {
    // Enable type checking during builds for better reliability
    ignoreBuildErrors: false,
  },
  
  // Configure environment for static export if needed
  experimental: {
    // Only keep supporting options for Next.js 14
    esmExternals: true,
    
    // Enable PPR if using Next.js canary
    // ppr: true,
  },
  
  // Security headers should be defined here instead of in experimental
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' unpkg.com;
              style-src 'self' 'unsafe-inline' unpkg.com;
              img-src 'self' data: blob: unpkg.com images.unsplash.com uploadthing.com utfs.io *.tile.openstreetmap.org *.googleusercontent.com stamen-tiles-a.a.ssl.fastly.net stamen-tiles-b.a.ssl.fastly.net stamen-tiles-c.a.ssl.fastly.net stamen-tiles-d.a.ssl.fastly.net *.basemaps.cartocdn.com oqzuskgsgufbntufufcz.supabase.co *.supabase.co *.stamen.com stadia.com *.tiles.stadiamaps.com *.stamen.io *.stadia.io *.mapbox.com *.opentopomap.org *.openweathermap.org cdn.leafletjs.com *.stamen.com *.arcgisonline.com;
              connect-src 'self' ws: wss: https://api.supabase.io ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''} https://*.basemaps.cartocdn.com https://*.ssl.fastly.net oqzuskgsgufbntufufcz.supabase.co *.supabase.co *.tiles.stadiamaps.com *.stamen.com api.stadiamaps.com api.mapbox.com api.opentopomap.org api.openweathermap.org;
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          }
        ],
      },
    ];
  },
  
  // Improve redirects handling
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  }
}

module.exports = withBundleAnalyzer(nextConfig) 