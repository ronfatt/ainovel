import { prisma } from "@/lib/prisma";

export async function syncPublishedChapterCover(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      projectId: true,
      chapterNo: true,
      isPublished: true,
      project: {
        select: {
          id: true,
          isPublic: true,
        },
      },
      covers: {
        where: { isPrimary: true },
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
        select: {
          imageData: true,
        },
      },
    },
  });

  if (!chapter) {
    return;
  }

  const primaryCoverData = chapter.covers[0]?.imageData ?? null;

  if (chapter.isPublished) {
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        publishedCoverData: primaryCoverData,
      },
    });
  }

  if (!chapter.project.isPublic || !primaryCoverData) {
    return;
  }

  const latestPublishedChapter = await prisma.chapter.findFirst({
    where: {
      projectId: chapter.projectId,
      isPublished: true,
    },
    orderBy: [{ chapterNo: "desc" }],
    select: {
      id: true,
    },
  });

  const shouldUpdateProjectCover = latestPublishedChapter?.id === chapter.id;

  if (shouldUpdateProjectCover) {
    await prisma.project.update({
      where: { id: chapter.projectId },
      data: {
        publicCoverData: primaryCoverData,
      },
    });
  }
}
