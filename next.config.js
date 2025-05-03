/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'uploadthing.com',
      'utfs.io',
    ],
  },
  // Configure environment for static export
  env: {
    NEXT_PUBLIC_SKIP_SUPABASE_SSG: 'true',
  },
  // For Next.js 14, we can't use serverExternalPackages directly
  // Set up some safeguard settings
  experimental: {
    // Only keep supporting options for Next.js 14
    esmExternals: true,
  },
}

module.exports = nextConfig 