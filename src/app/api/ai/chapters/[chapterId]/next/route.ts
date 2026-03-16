import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

const nextChapterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    corePayoff: { type: "string" },
    endingHook: { type: "string" },
    wordCountTarget: { type: "integer" },
  },
  required: ["title", "summary", "corePayoff", "endingHook", "wordCountTarget"],
} as const;

type NextChapterDraft = {
  title: string;
  summary: string;
  corePayoff: string;
  endingHook: string;
  wordCountTarget: number;
};

export async function POST(_: Request, context: RouteContext) {
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
            storyBible: true,
            outline: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    if (!chapter.project.storyBible || !chapter.project.outline) {
      return NextResponse.json(
        { message: "请先完成故事设定和大纲，再生成下一章。" },
        { status: 400 },
      );
    }

    const existingNextChapter = await prisma.chapter.findFirst({
      where: {
        projectId: chapter.projectId,
        chapterNo: chapter.chapterNo + 1,
      },
    });

    if (existingNextChapter) {
      return NextResponse.json(
        { message: "下一章已经存在，请直接去目录页或章节页查看。" },
        { status: 400 },
      );
    }

    const allChapters = await prisma.chapter.findMany({
      where: { projectId: chapter.projectId },
      orderBy: [{ chapterNo: "asc" }],
      select: {
        chapterNo: true,
        title: true,
        summary: true,
        corePayoff: true,
        endingHook: true,
      },
    });

    const recentChapters = allChapters
      .filter((item) => item.chapterNo <= chapter.chapterNo)
      .slice(-4);
    const currentDraft = await prisma.chapterDraft.findFirst({
      where: {
        chapterId: chapter.id,
        isCurrent: true,
      },
      orderBy: [{ draftNo: "desc" }],
      select: {
        content: true,
      },
    });
    const storyBible = chapter.project.storyBible;
    const structure = chapter.project.outline.structureData as {
      openingHook?: string;
      volumePlan?: string;
      midpointTwist?: string;
      finaleDirection?: string;
    };

    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      reasoning: {
        effort: "low",
      },
      instructions:
        "你是一个擅长中文爽文连载节奏规划的小说编辑。请根据当前章节、最近几章和全书设定，生成下一章的目录项。输出必须是简体中文，不要解释，不要输出额外文字，只输出符合 schema 的 JSON。",
      input: [
        `作品名：${chapter.project.title}`,
        `题材：${chapter.project.genre}`,
        `核心脑洞：${chapter.project.premise}`,
        `一句话卖点：${storyBible.logline}`,
        `故事简介：${storyBible.synopsis}`,
        `核心冲突：${storyBible.coreConflict}`,
        `全书大纲摘要：${chapter.project.outline.summary ?? ""}`,
        `开篇钩子：${structure.openingHook ?? ""}`,
        `分卷规划：${structure.volumePlan ?? ""}`,
        `当前章节：第 ${chapter.chapterNo} 章`,
        `当前章节标题：${chapter.title}`,
        `当前章节摘要：${chapter.summary}`,
        `当前章节爽点：${chapter.corePayoff ?? ""}`,
        `当前章节结尾钩子：${chapter.endingHook ?? ""}`,
        `当前章节正文结尾状态：${currentDraft?.content.slice(-220) ?? ""}`,
        `最近章节参考：${JSON.stringify(recentChapters)}`,
        `请生成第 ${chapter.chapterNo + 1} 章的目录项。`,
      ].join("\n"),
      max_output_tokens: 2200,
      text: {
        format: {
          type: "json_schema",
          name: "next_chapter",
          schema: nextChapterSchema,
          strict: true,
        },
      },
    });

    if (response.incomplete_details?.reason === "max_output_tokens") {
      return NextResponse.json(
        {
          message: "AI 生成下一章目录时输出被截断了。请重试一次。",
        },
        { status: 502 },
      );
    }

    if (!response.output_text) {
      return NextResponse.json(
        {
          message: "AI 没有返回可用的下一章目录内容。请重试一次。",
        },
        { status: 502 },
      );
    }

    let draft: NextChapterDraft;

    try {
      draft = JSON.parse(response.output_text) as NextChapterDraft;
    } catch (parseError) {
      console.error("Failed to parse next chapter response", parseError);

      return NextResponse.json(
        {
          message: "AI 返回的下一章目录格式不完整，请重试一次。",
        },
        { status: 502 },
      );
    }
    const nextChapter = await prisma.chapter.create({
      data: {
        projectId: chapter.projectId,
        outlineId: chapter.outlineId,
        chapterNo: chapter.chapterNo + 1,
        volumeNo: chapter.volumeNo,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        corePayoff: draft.corePayoff.trim(),
        endingHook: draft.endingHook.trim(),
        wordCountTarget: draft.wordCountTarget,
      },
    });

    return NextResponse.json({
      nextChapter,
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate next chapter", error);

    return NextResponse.json(
      {
        message: "AI 生成下一章失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
