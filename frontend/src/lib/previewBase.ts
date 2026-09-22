/**
 * Resolves base path for frontend builds, handling PR previews on GitHub Pages
 */
export function resolvePreviewBase(env: {
  GITHUB_ACTIONS?: string;
  GITHUB_REF?: string;
  GITHUB_REPOSITORY?: string;
}): string {
  if (env.GITHUB_ACTIONS === "true" && env.GITHUB_REF?.startsWith("refs/pull/")) {
    const prNumber = env.GITHUB_REF.split("/")[2];
    const repoName = env.GITHUB_REPOSITORY?.split("/")[1] || "explys";
    return `/${repoName}/pr-preview/pr-${prNumber}/`;
  }
  return "/";
}
