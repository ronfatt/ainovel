import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ChapterPayload = {
  chapterNo: number;
  volumeNo?: number;
  title: string;
  summary: string;
  corePayoff?: string | null;
  endingHook?: string | null;
  wordCountTarget?: number | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        genre: true,
        premise: true,
        tone: true,
        sourceLanguage: true,
        defaultOutputLanguage: true,
        terminologyMode: true,
        outline: {
          select: {
            id: true,
            title: true,
            summary: true,
            version: true,
          },
        },
        chapters: {
          orderBy: [{ chapterNo: "asc" }],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    return NextResponse.json({
      project,
      chapters: project.chapters,
    });
  } catch (error) {
    console.error("Failed to load chapters", error);

    return NextResponse.json(
      { message: "读取章节目录失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: { chapters?: ChapterPayload[] };

  try {
    body = (await request.json()) as { chapters?: ChapterPayload[] };
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const chapters = Array.isArray(body.chapters) ? body.chapters : [];

  if (chapters.length === 0) {
    return NextResponse.json({ message: "至少需要一章目录。" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { outline: { select: { id: true } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.chapter.deleteMany({
        where: { projectId: id },
      });

      for (const chapter of chapters) {
        await tx.chapter.create({
          data: {
            projectId: id,
            outlineId: project?.outline?.id ?? null,
            chapterNo: chapter.chapterNo,
            volumeNo: chapter.volumeNo ?? 1,
            title: chapter.title.trim(),
            summary: chapter.summary.trim(),
            corePayoff: chapter.corePayoff?.trim() || null,
            endingHook: chapter.endingHook?.trim() || null,
            wordCountTarget:
              typeof chapter.wordCountTarget === "number" && Number.isFinite(chapter.wordCountTarget)
                ? Math.max(0, Math.floor(chapter.wordCountTarget))
                : null,
          },
        });
      }
    });

    const savedChapters = await prisma.chapter.findMany({
      where: { projectId: id },
      orderBy: [{ chapterNo: "asc" }],
    });

    return NextResponse.json({ chapters: savedChapters });
  } catch (error) {
    console.error("Failed to save chapters", error);

    return NextResponse.json(
      { message: "保存章节目录失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
