/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@site-haus/sdk",
    "@site-haus/contracts",
    "@site-haus/ui",
    "@site-haus/validation",
  ],
};

export default nextConfig;
