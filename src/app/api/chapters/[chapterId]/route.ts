import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { chapterId } = await context.params;

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            publicSlug: true,
            publicTitle: true,
            genre: true,
            premise: true,
            tone: true,
            sourceLanguage: true,
            defaultOutputLanguage: true,
            terminologyMode: true,
            storyBible: true,
            outline: true,
            characters: {
              orderBy: [{ isVisualAnchor: "desc" }, { updatedAt: "desc" }],
              select: {
                id: true,
                name: true,
                role: true,
                isVisualAnchor: true,
                referenceImageData: true,
              },
            },
          },
        },
        drafts: {
          orderBy: [{ createdAt: "desc" }],
          take: 6,
        },
        briefs: {
          orderBy: [{ version: "desc" }],
          take: 6,
        },
        covers: {
          orderBy: [{ createdAt: "desc" }],
          take: 6,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    const previousChapter =
      chapter.chapterNo > 1
        ? await prisma.chapter.findFirst({
            where: {
              projectId: chapter.projectId,
              chapterNo: chapter.chapterNo - 1,
            },
            include: {
              briefs: {
                where: { isCurrent: true },
                orderBy: [{ version: "desc" }],
                take: 1,
              },
              drafts: {
                where: { isCurrent: true },
                orderBy: [{ draftNo: "desc" }],
                take: 1,
              },
            },
          })
        : null;

    return NextResponse.json({ chapter, previousChapter });
  } catch (error) {
    console.error("Failed to load chapter", error);

    return NextResponse.json(
      { message: "读取章节失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}
