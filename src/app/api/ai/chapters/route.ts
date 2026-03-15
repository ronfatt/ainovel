import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type GenerateChaptersBody = {
  projectId?: string;
  chapterCount?: number;
};

const chapterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    chapters: {
      type: "array",
      minItems: 8,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          chapterNo: { type: "integer" },
          volumeNo: { type: "integer" },
          title: { type: "string" },
          summary: { type: "string" },
          corePayoff: { type: "string" },
          endingHook: { type: "string" },
          wordCountTarget: { type: "integer" },
        },
        required: [
          "chapterNo",
          "volumeNo",
          "title",
          "summary",
          "corePayoff",
          "endingHook",
          "wordCountTarget",
        ],
      },
    },
  },
  required: ["chapters"],
} as const;

type ChapterDraft = {
  chapters: Array<{
    chapterNo: number;
    volumeNo: number;
    title: string;
    summary: string;
    corePayoff: string;
    endingHook: string;
    wordCountTarget: number;
  }>;
};

export async function POST(request: Request) {
  let body: GenerateChaptersBody;

  try {
    body = (await request.json()) as GenerateChaptersBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const chapterCount =
    typeof body.chapterCount === "number" && Number.isFinite(body.chapterCount)
      ? Math.min(20, Math.max(8, Math.floor(body.chapterCount)))
      : 12;

  if (!projectId) {
    return NextResponse.json({ message: "缺少 projectId。" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        storyBible: true,
        outline: true,
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    if (!project.storyBible || !project.outline) {
      return NextResponse.json(
        { message: "请先完成故事设定和大纲，再生成章节目录。" },
        { status: 400 },
      );
    }

    const storyBible = project.storyBible;
    const structure = project.outline.structureData as {
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
        "你是一个擅长中文爽文策划的小说编辑。请基于用户已经确认的故事设定和全书大纲，生成一份中文章节目录。输出必须是简体中文，章节标题要有网文连载感，每章摘要要明确推进，结尾钩子要能促使读者继续点下一章。不要解释，不要输出额外文字，只输出符合 schema 的 JSON。",
      input: [
        `作品名：${project.title}`,
        `题材：${project.genre}`,
        `核心脑洞：${project.premise}`,
        `一句话卖点：${storyBible.logline}`,
        `故事简介：${storyBible.synopsis}`,
        `核心冲突：${storyBible.coreConflict}`,
        `全书大纲摘要：${project.outline.summary ?? ""}`,
        `开篇钩子：${structure.openingHook ?? ""}`,
        `分卷规划：${structure.volumePlan ?? ""}`,
        `中期转折：${structure.midpointTwist ?? ""}`,
        `结局方向：${structure.finaleDirection ?? ""}`,
        `请生成前 ${chapterCount} 章的中文章节目录。`,
      ].join("\n"),
      max_output_tokens: 4800,
      text: {
        format: {
          type: "json_schema",
          name: "chapter_outline",
          schema: chapterSchema,
          strict: true,
        },
      },
    });

    if (response.incomplete_details?.reason === "max_output_tokens") {
      return NextResponse.json(
        {
          message:
            "AI 生成章节目录时输出被截断了。请重试一次，或减少章节数后再生成。",
        },
        { status: 502 },
      );
    }

    if (!response.output_text) {
      return NextResponse.json(
        {
          message: "AI 没有返回可用的章节目录内容。请重试一次。",
        },
        { status: 502 },
      );
    }

    let draft: ChapterDraft;

    try {
      draft = JSON.parse(response.output_text) as ChapterDraft;
    } catch (parseError) {
      console.error("Failed to parse generated chapter outline", parseError);

      return NextResponse.json(
        {
          message:
            "AI 返回的章节目录格式不完整，可能是输出被截断了。请重试一次，或减少章节数后再生成。",
        },
        { status: 502 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.chapter.deleteMany({
        where: { projectId },
      });

      for (const chapter of draft.chapters) {
        await tx.chapter.create({
          data: {
            projectId,
            outlineId: project.outline?.id ?? null,
            chapterNo: chapter.chapterNo,
            volumeNo: chapter.volumeNo,
            title: chapter.title.trim(),
            summary: chapter.summary.trim(),
            corePayoff: chapter.corePayoff.trim(),
            endingHook: chapter.endingHook.trim(),
            wordCountTarget: chapter.wordCountTarget,
          },
        });
      }
    });

    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: [{ chapterNo: "asc" }],
    });

    return NextResponse.json({
      chapters,
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate chapters", error);

    return NextResponse.json(
      {
        message: "AI 生成章节目录失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
