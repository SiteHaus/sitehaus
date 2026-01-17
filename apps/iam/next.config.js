/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@site-haus/sdk",
    "@site-haus/contracts",
    "@site-haus/ui",
    "@site-haus/validation",
  ],
  async rewrites() {
    // In development, proxy API calls through Next.js to avoid cross-origin cookie issues
    const apiUrl = process.env.API_PROXY_URL || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
