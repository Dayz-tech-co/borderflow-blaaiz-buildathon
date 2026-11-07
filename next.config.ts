import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/borderflow-blaaiz-buildathon" : "",
};

export default nextConfig;
