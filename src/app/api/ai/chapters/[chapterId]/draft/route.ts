import { NextResponse } from "next/server";
import { OutputLanguage } from "@/generated/prisma/client";
import {
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/openai";
import {
  getOutputLanguagePrompt,
  getTerminologyPrompt,
} from "@/lib/project-language";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type GenerateDraftBody = {
  outputLanguage?: OutputLanguage;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;

  let body: GenerateDraftBody;

  try {
    body = (await request.json()) as GenerateDraftBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

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
        briefs: {
          where: { isCurrent: true },
          orderBy: [{ version: "desc" }],
          take: 1,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    if (!chapter.project.storyBible || !chapter.project.outline) {
      return NextResponse.json(
        { message: "请先完成故事设定和大纲，再生成正文。" },
        { status: 400 },
      );
    }

    const outputLanguage =
      body.outputLanguage === OutputLanguage.MS_MY
        ? OutputLanguage.MS_MY
        : chapter.project.defaultOutputLanguage;
    const generationMode =
      outputLanguage === OutputLanguage.MS_MY ? "localized_adaptation" : "original";
    const storyBible = chapter.project.storyBible;
    const currentBrief = chapter.briefs[0];
    const structure = chapter.project.outline.structureData as {
      openingHook?: string;
      volumePlan?: string;
      midpointTwist?: string;
      finaleDirection?: string;
    };
    const targetWordCount = chapter.wordCountTarget ?? 1800;
    const maxOutputTokens = Math.min(
      9000,
      Math.max(4200, Math.ceil(targetWordCount * 2.8)),
    );

    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      reasoning: {
        effort: "low",
      },
      instructions: [
        "你是一个擅长长篇连载网文的职业小说作者。",
        "你会严格根据中文母稿设定、大纲和章节摘要写正文，不乱改主线。",
        `本次输出语言必须是：${getOutputLanguagePrompt(outputLanguage)}。`,
        outputLanguage === OutputLanguage.MS_MY
          ? "这不是逐字翻译。请基于中文策划稿，生成自然、流畅、适合马来西亚读者阅读的马来文小说正文。"
          : "请直接写出自然、连载感强的中文爽文正文。",
        getTerminologyPrompt(chapter.project.terminologyMode),
        "章节结尾要留一个明显的钩子，推动读者继续下一章。",
      ].join("\n"),
      input: [
        `作品名：${chapter.project.title}`,
        `题材：${chapter.project.genre}`,
        `核心脑洞：${chapter.project.premise}`,
        `风格偏好：${chapter.project.tone ?? "未提供"}`,
        `一句话卖点：${storyBible.logline}`,
        `故事简介：${storyBible.synopsis}`,
        `核心冲突：${storyBible.coreConflict}`,
        `开篇钩子：${structure.openingHook ?? ""}`,
        `分卷规划：${structure.volumePlan ?? ""}`,
        `当前章节：第 ${chapter.chapterNo} 章`,
        `章节标题：${chapter.title}`,
        `章节摘要：${chapter.summary}`,
        `本章爽点：${chapter.corePayoff ?? ""}`,
        `本章结尾钩子：${chapter.endingHook ?? ""}`,
        `本章细纲开场：${(currentBrief?.briefData as { opening?: string } | null)?.opening ?? ""}`,
        `本章细纲冲突：${(currentBrief?.briefData as { conflict?: string } | null)?.conflict ?? ""}`,
        `本章细纲爽点：${(currentBrief?.briefData as { payoff?: string } | null)?.payoff ?? ""}`,
        `本章细纲转折：${(currentBrief?.briefData as { twist?: string } | null)?.twist ?? ""}`,
        `本章细纲结尾：${(currentBrief?.briefData as { endingHook?: string } | null)?.endingHook ?? ""}`,
        `目标字数：${targetWordCount}`,
        "请直接输出正文，不要加标题解释，不要输出 JSON。",
      ].join("\n"),
      max_output_tokens: maxOutputTokens,
    });

    if (response.incomplete_details?.reason === "max_output_tokens") {
      return NextResponse.json(
        {
          message:
            "AI 生成正文时输出被截断了。请重试一次，或适当降低本章目标字数后再生成。",
        },
        { status: 502 },
      );
    }

    const content = response.output_text?.trim();

    if (!content) {
      return NextResponse.json(
        {
          message: "AI 没有返回可用的正文内容。请重试一次。",
        },
        { status: 502 },
      );
    }

    const lastDraft = await prisma.chapterDraft.findFirst({
      where: { chapterId },
      orderBy: [{ draftNo: "desc" }],
      select: { draftNo: true },
    });

    const draft = await prisma.chapterDraft.create({
      data: {
        chapterId,
        draftNo: (lastDraft?.draftNo ?? 0) + 1,
        language: outputLanguage,
        generationMode,
        content,
        wordCount: content.length,
        modelName: getOpenAIModel(),
        promptSnapshot: {
          outputLanguage,
          terminologyMode: chapter.project.terminologyMode,
          generationMode,
          chapterNo: chapter.chapterNo,
        },
      },
    });

    return NextResponse.json({
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate chapter draft", error);

    return NextResponse.json(
      {
        message: "AI 生成正文失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
