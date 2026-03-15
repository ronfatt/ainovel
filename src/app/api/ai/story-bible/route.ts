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
      reasoning: {
        effort: "low",
      },
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
      max_output_tokens: 4200,
      text: {
        format: {
          type: "json_schema",
          name: "story_bible",
          schema: storyBibleSchema,
          strict: true,
        },
      },
    });

    if (response.incomplete_details?.reason === "max_output_tokens") {
      return NextResponse.json(
        {
          message:
            "AI 输出在生成中被截断了。请重新点击生成，或稍后我可以继续帮你把这一步做得更稳定。",
        },
        { status: 502 },
      );
    }

    if (!response.output_text) {
      throw new Error("Model returned an empty response.");
    }

    let draft: StoryBibleDraft;

    try {
      draft = JSON.parse(response.output_text) as StoryBibleDraft;
    } catch (parseError) {
      console.error("Failed to parse story bible JSON", parseError, response.output_text);

      return NextResponse.json(
        {
          message:
            "AI 已返回内容，但结果在解析时失败了。通常是输出被截断或格式不完整，请重试一次。",
        },
        { status: 502 },
      );
    }

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
          "AI 生成故事设定失败。请确认 OpenAI 和数据库配置正常，或稍后重试。",
      },
      { status: 500 },
    );
  }
}
