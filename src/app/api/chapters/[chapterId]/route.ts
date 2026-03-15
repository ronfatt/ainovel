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
            genre: true,
            premise: true,
            tone: true,
            sourceLanguage: true,
            defaultOutputLanguage: true,
            terminologyMode: true,
            storyBible: true,
            outline: true,
          },
        },
        drafts: {
          orderBy: [{ createdAt: "desc" }],
          take: 6,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("Failed to load chapter", error);

    return NextResponse.json(
      { message: "读取章节失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}
