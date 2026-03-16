export function createPublicSlug(title: string, projectId: string) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (normalized) {
    return normalized;
  }

  return `novel-${projectId.slice(-8)}`;
}
