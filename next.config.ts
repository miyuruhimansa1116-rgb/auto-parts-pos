import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ගිණුම් ගත කිරීමේදී (Build) TypeScript errors නොසලකා හරිනු ලැබේ
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;