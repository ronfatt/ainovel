import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

const briefSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    opening: { type: "string" },
    conflict: { type: "string" },
    payoff: { type: "string" },
    twist: { type: "string" },
    endingHook: { type: "string" },
    notes: { type: "string" },
  },
  required: ["opening", "conflict", "payoff", "twist", "endingHook", "notes"],
} as const;

type BriefDraft = {
  opening: string;
  conflict: string;
  payoff: string;
  twist: string;
  endingHook: string;
  notes: string;
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
        { message: "请先完成故事设定和大纲，再生成章节细纲。" },
        { status: 400 },
      );
    }

    const storyBible = chapter.project.storyBible;
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
    const previousBrief = previousChapter?.briefs[0];
    const previousDraft = previousChapter?.drafts[0];
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions:
        "你是一个擅长中文爽文结构拆解的小说编辑。请根据用户已经确认的长篇设定、大纲和章节目录，生成一份单章细纲。输出必须是简体中文，不要解释，不要输出额外文字，只输出符合 schema 的 JSON。",
      input: [
        `作品名：${chapter.project.title}`,
        `题材：${chapter.project.genre}`,
        `核心脑洞：${chapter.project.premise}`,
        `一句话卖点：${storyBible.logline}`,
        `故事简介：${storyBible.synopsis}`,
        `核心冲突：${storyBible.coreConflict}`,
        previousChapter ? `上一章：第 ${previousChapter.chapterNo} 章《${previousChapter.title}》` : "",
        `上一章摘要：${previousChapter?.summary ?? ""}`,
        `上一章爽点：${previousChapter?.corePayoff ?? ""}`,
        `上一章结尾钩子：${previousChapter?.endingHook ?? ""}`,
        `上一章细纲结尾：${(previousBrief?.briefData as { endingHook?: string } | null)?.endingHook ?? ""}`,
        `上一章正文结尾状态：${previousDraft?.content.slice(-280) ?? ""}`,
        `当前章节：第 ${chapter.chapterNo} 章`,
        `章节标题：${chapter.title}`,
        `章节摘要：${chapter.summary}`,
        `本章爽点：${chapter.corePayoff ?? ""}`,
        `结尾钩子：${chapter.endingHook ?? ""}`,
        "请把本章拆成开场、冲突推进、爽点爆发、转折、结尾钩子。",
      ].join("\n"),
      max_output_tokens: 1800,
      text: {
        format: {
          type: "json_schema",
          name: "chapter_brief",
          schema: briefSchema,
          strict: true,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("Model returned an empty brief.");
    }

    const draft = JSON.parse(response.output_text) as BriefDraft;
    const lastBrief = await prisma.chapterBrief.findFirst({
      where: { chapterId },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });

    const brief = await prisma.$transaction(async (tx) => {
      await tx.chapterBrief.updateMany({
        where: { chapterId, isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.chapterBrief.create({
        data: {
          chapterId,
          briefData: {
            opening: draft.opening.trim(),
            conflict: draft.conflict.trim(),
            payoff: draft.payoff.trim(),
            twist: draft.twist.trim(),
            endingHook: draft.endingHook.trim(),
          },
          notes: draft.notes.trim(),
          version: (lastBrief?.version ?? 0) + 1,
          isCurrent: true,
        },
      });
    });

    return NextResponse.json({
      brief,
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate chapter brief", error);

    return NextResponse.json(
      {
        message:
          "AI 生成章节细纲失败。请确认 OPENAI_API_KEY 已经配置，并检查数据库连接是否正常。",
      },
      { status: 500 },
    );
  }
}
