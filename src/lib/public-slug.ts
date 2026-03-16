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

export function normalizePublicSlug(value: string) {
  try {
    return decodeURIComponent(value).normalize("NFKC").trim();
  } catch {
    return value.normalize("NFKC").trim();
  }
}

export function getPublicSlugCandidates(input: {
  projectId: string;
  title: string;
  publicTitle?: string | null;
  publicSlug?: string | null;
}) {
  return Array.from(
    new Set(
      [
        input.projectId,
        input.publicSlug,
        createPublicSlug(input.title, input.projectId),
        input.publicTitle ? createPublicSlug(input.publicTitle, input.projectId) : null,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => normalizePublicSlug(value)),
    ),
  );
}
