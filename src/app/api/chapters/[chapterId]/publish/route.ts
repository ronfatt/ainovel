import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicSlug } from "@/lib/public-slug";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type PublishBody = {
  content?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;
  let body: PublishBody;

  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ message: "请先准备好正文，再发布本章。" }, { status: 400 });
  }

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
            storyBible: {
              select: {
                synopsis: true,
              },
            },
          },
        },
        covers: {
          where: { isPrimary: true },
          take: 1,
          select: {
            imageData: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    const primaryCoverData = chapter.covers[0]?.imageData ?? null;
    const initialSlug =
      chapter.project.publicSlug ?? createPublicSlug(chapter.project.title, chapter.project.id);

    let publicSlug = initialSlug;
    let suffix = 1;

    while (true) {
      const conflict = await prisma.project.findFirst({
        where: {
          publicSlug,
          id: { not: chapter.project.id },
        },
        select: { id: true },
      });

      if (!conflict) {
        break;
      }

      suffix += 1;
      publicSlug = `${initialSlug}-${suffix}`;
    }

    const publishedAt = new Date();

    await prisma.$transaction([
      prisma.project.update({
        where: { id: chapter.project.id },
        data: {
          isPublic: true,
          publicSlug,
          publicTitle: chapter.project.publicTitle ?? chapter.project.title,
          publicIntro: chapter.project.storyBible?.synopsis ?? null,
          publicCoverData: primaryCoverData ?? undefined,
        },
      }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          isPublished: true,
          publishedAt,
          publishedTitle: chapter.title,
          publishedContent: content,
          publishedCoverData: primaryCoverData,
        },
      }),
    ]);

    return NextResponse.json({
      message: "本章已发布。",
      publicPath: `/novels/${publicSlug}/chapters/${chapter.chapterNo}`,
      publicSlug,
      chapterNo: chapter.chapterNo,
    });
  } catch (error) {
    console.error("Failed to publish chapter", error);

    return NextResponse.json(
      { message: "发布本章失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
