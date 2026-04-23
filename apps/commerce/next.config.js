/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.staging.commerce.sitehaus.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.commerce.sitehaus.dev",
      },
    ],
  },
};

export default nextConfig;
