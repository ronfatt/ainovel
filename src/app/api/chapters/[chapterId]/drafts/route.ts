import { NextResponse } from "next/server";
import { OutputLanguage } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DraftBody = {
  content?: string;
  language?: OutputLanguage;
  generationMode?: string;
};

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;

  let body: DraftBody;

  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ message: "正文内容不能为空。" }, { status: 400 });
  }

  const language =
    body.language === OutputLanguage.MS_MY ? OutputLanguage.MS_MY : OutputLanguage.ZH_CN;

  try {
    const lastDraft = await prisma.chapterDraft.findFirst({
      where: { chapterId },
      orderBy: [{ draftNo: "desc" }],
      select: { draftNo: true },
    });

    const draft = await prisma.chapterDraft.create({
      data: {
        chapterId,
        draftNo: (lastDraft?.draftNo ?? 0) + 1,
        language,
        generationMode: body.generationMode?.trim() || "manual_edit",
        content,
        wordCount: content.length,
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("Failed to save chapter draft", error);

    return NextResponse.json(
      { message: "保存正文失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
