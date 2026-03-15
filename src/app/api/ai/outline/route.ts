import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type GenerateOutlineBody = {
  projectId?: string;
};

const outlineSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    openingHook: { type: "string" },
    volumePlan: { type: "string" },
    midpointTwist: { type: "string" },
    finaleDirection: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "openingHook",
    "volumePlan",
    "midpointTwist",
    "finaleDirection",
  ],
} as const;

type OutlineDraft = {
  title: string;
  summary: string;
  openingHook: string;
  volumePlan: string;
  midpointTwist: string;
  finaleDirection: string;
};

export async function POST(request: Request) {
  let body: GenerateOutlineBody;

  try {
    body = (await request.json()) as GenerateOutlineBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();

  if (!projectId) {
    return NextResponse.json({ message: "缺少 projectId。" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        storyBible: true,
        outline: {
          select: {
            version: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    if (!project.storyBible) {
      return NextResponse.json(
        { message: "请先完成故事设定，再生成大纲。" },
        { status: 400 },
      );
    }

    const storyBible = project.storyBible;
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions:
        "你是一个擅长中文爽文策划的小说编辑。请基于用户已经确认的故事设定，生成一份适合长篇连载的全书大纲。输出必须是简体中文，强调开篇钩子、分卷升级、反派压制、阶段性爽点和结尾爆点。不要解释，不要输出额外文字，只输出符合 schema 的 JSON。",
      input: [
        `作品名：${project.title}`,
        `题材：${project.genre}`,
        `核心脑洞：${project.premise}`,
        `风格偏好：${project.tone ?? "未提供"}`,
        `策划语言：中文母稿`,
        `未来正文默认输出语言：${project.defaultOutputLanguage === "MS_MY" ? "马来文" : "中文"}`,
        `专有名词策略：${
          project.terminologyMode === "LOCALIZED_TERMS"
            ? "正文生成时尽量本地化表达"
            : project.terminologyMode === "HYBRID_TERMS"
              ? "正文生成时保留中文术语并适度解释"
              : "正文生成时保留中文风格术语"
        }`,
        `一句话卖点：${storyBible.logline}`,
        `故事简介：${storyBible.synopsis}`,
        `核心冲突：${storyBible.coreConflict}`,
        `主角设定：${(storyBible.protagonistProfile as { content?: string } | null)?.content ?? ""}`,
        `反派设定：${(storyBible.antagonistProfile as { content?: string } | null)?.content ?? ""}`,
        `世界观：${(storyBible.worldSetting as { content?: string } | null)?.content ?? ""}`,
        `力量体系：${(storyBible.powerSystem as { content?: string } | null)?.content ?? ""}`,
        `主线目标：${(storyBible.mainPlot as { content?: string } | null)?.content ?? ""}`,
        `前期爽点：${(storyBible.earlyStageHighlights as { content?: string } | null)?.content ?? ""}`,
        "请生成一版适合 50 万字左右中文爽文连载的全书大纲。",
      ].join("\n"),
      max_output_tokens: 2600,
      text: {
        format: {
          type: "json_schema",
          name: "outline",
          schema: outlineSchema,
          strict: true,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("Model returned an empty response.");
    }

    const draft = JSON.parse(response.output_text) as OutlineDraft;

    const outline = await prisma.outline.upsert({
      where: { projectId },
      create: {
        projectId,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        structureData: {
          openingHook: draft.openingHook.trim(),
          volumePlan: draft.volumePlan.trim(),
          midpointTwist: draft.midpointTwist.trim(),
          finaleDirection: draft.finaleDirection.trim(),
        },
        version: 1,
      },
      update: {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        structureData: {
          openingHook: draft.openingHook.trim(),
          volumePlan: draft.volumePlan.trim(),
          midpointTwist: draft.midpointTwist.trim(),
          finaleDirection: draft.finaleDirection.trim(),
        },
        version: (project.outline?.version ?? 0) + 1,
      },
    });

    return NextResponse.json({
      outline,
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate outline", error);

    return NextResponse.json(
      {
        message:
          "AI 生成大纲失败。请确认 OPENAI_API_KEY 已经配置，并检查数据库连接是否正常。",
      },
      { status: 500 },
    );
  }
}
