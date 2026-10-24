/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['motion', 'lucide-react'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
