/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vbz/ui', '@vbz/firebase', '@vbz/game-core', '@vbz/shared-types'],
};

module.exports = nextConfig;
