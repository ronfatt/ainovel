import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type GenerateStoryBibleBody = {
  projectId?: string;
};

const storyBibleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    logline: { type: "string" },
    synopsis: { type: "string" },
    coreConflict: { type: "string" },
    protagonistProfile: { type: "string" },
    supportingCast: { type: "string" },
    antagonistProfile: { type: "string" },
    worldSetting: { type: "string" },
    powerSystem: { type: "string" },
    mainPlot: { type: "string" },
    earlyStageHighlights: { type: "string" },
    styleRules: { type: "string" },
    lockedFields: { type: "string" },
  },
  required: [
    "logline",
    "synopsis",
    "coreConflict",
    "protagonistProfile",
    "supportingCast",
    "antagonistProfile",
    "worldSetting",
    "powerSystem",
    "mainPlot",
    "earlyStageHighlights",
    "styleRules",
    "lockedFields",
  ],
} as const;

type StoryBibleDraft = {
  logline: string;
  synopsis: string;
  coreConflict: string;
  protagonistProfile: string;
  supportingCast: string;
  antagonistProfile: string;
  worldSetting: string;
  powerSystem: string;
  mainPlot: string;
  earlyStageHighlights: string;
  styleRules: string;
  lockedFields: string;
};

function jsonBlock(value: string) {
  const trimmed = value.trim();
  return trimmed ? { content: trimmed } : Prisma.JsonNull;
}

export async function POST(request: Request) {
  let body: GenerateStoryBibleBody;

  try {
    body = (await request.json()) as GenerateStoryBibleBody;
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
        storyBible: {
          select: {
            version: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions:
        "你是一个擅长中文爽文策划的小说编辑。请根据用户提供的作品信息，生成一份适合网文创作的故事设定初稿。输出必须是简体中文，内容要强调爽点、升级路径、冲突和章节连载感。不要解释，不要输出额外文字，只输出符合 schema 的 JSON。",
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
        "请给我一版适合中文爽文平台的故事设定初稿。",
      ].join("\n"),
      max_output_tokens: 2200,
      text: {
        format: {
          type: "json_schema",
          name: "story_bible",
          schema: storyBibleSchema,
          strict: true,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("Model returned an empty response.");
    }

    const draft = JSON.parse(response.output_text) as StoryBibleDraft;

    const storyBible = await prisma.storyBible.upsert({
      where: { projectId },
      create: {
        projectId,
        logline: draft.logline.trim(),
        synopsis: draft.synopsis.trim(),
        coreConflict: draft.coreConflict.trim(),
        protagonistProfile: jsonBlock(draft.protagonistProfile),
        supportingCast: jsonBlock(draft.supportingCast),
        antagonistProfile: jsonBlock(draft.antagonistProfile),
        worldSetting: jsonBlock(draft.worldSetting),
        powerSystem: jsonBlock(draft.powerSystem),
        mainPlot: jsonBlock(draft.mainPlot),
        earlyStageHighlights: jsonBlock(draft.earlyStageHighlights),
        styleRules: jsonBlock(draft.styleRules),
        lockedFields: jsonBlock(draft.lockedFields),
        version: 1,
      },
      update: {
        logline: draft.logline.trim(),
        synopsis: draft.synopsis.trim(),
        coreConflict: draft.coreConflict.trim(),
        protagonistProfile: jsonBlock(draft.protagonistProfile),
        supportingCast: jsonBlock(draft.supportingCast),
        antagonistProfile: jsonBlock(draft.antagonistProfile),
        worldSetting: jsonBlock(draft.worldSetting),
        powerSystem: jsonBlock(draft.powerSystem),
        mainPlot: jsonBlock(draft.mainPlot),
        earlyStageHighlights: jsonBlock(draft.earlyStageHighlights),
        styleRules: jsonBlock(draft.styleRules),
        lockedFields: jsonBlock(draft.lockedFields),
        version: (project.storyBible?.version ?? 0) + 1,
      },
    });

    return NextResponse.json({
      storyBible,
      draft,
      model: getOpenAIModel(),
    });
  } catch (error) {
    console.error("Failed to generate story bible", error);

    return NextResponse.json(
      {
        message:
          "AI 生成故事设定失败。请确认 OPENAI_API_KEY 已经配置，并检查数据库连接是否正常。",
      },
      { status: 500 },
    );
  }
}
