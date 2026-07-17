import type { NextConfig } from "next";

/**
 * GitHub Pages 静态导出配置
 * - 仓库页：https://<user>.github.io/<repo>/
 * - 可通过环境变量覆盖：GITHUB_PAGES=true、GITHUB_REPOSITORY=owner/repo
 */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ||
  (isGithubPages && repoName ? `/${repoName}` : "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
