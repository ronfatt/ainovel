import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type StoryBibleBody = {
  logline?: string;
  synopsis?: string;
  coreConflict?: string;
  protagonistProfile?: string;
  supportingCast?: string;
  antagonistProfile?: string;
  worldSetting?: string;
  powerSystem?: string;
  mainPlot?: string;
  earlyStageHighlights?: string;
  styleRules?: string;
  lockedFields?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toJsonBlock(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? { content: trimmed } : Prisma.JsonNull;
}

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
        storyBible: true,
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    return NextResponse.json({ project, storyBible: project.storyBible });
  } catch (error) {
    console.error("Failed to load story bible", error);

    return NextResponse.json(
      { message: "读取故事设定失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: StoryBibleBody;

  try {
    body = (await request.json()) as StoryBibleBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const logline = body.logline?.trim();
  const synopsis = body.synopsis?.trim();
  const coreConflict = body.coreConflict?.trim();

  if (!logline || !synopsis || !coreConflict) {
    return NextResponse.json(
      { message: "请至少填写一句话卖点、故事简介和核心冲突。" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.storyBible.findUnique({
      where: { projectId: id },
      select: { id: true, version: true },
    });

    const storyBible = await prisma.storyBible.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        logline,
        synopsis,
        coreConflict,
        protagonistProfile: toJsonBlock(body.protagonistProfile) ?? { content: "" },
        supportingCast: toJsonBlock(body.supportingCast),
        antagonistProfile: toJsonBlock(body.antagonistProfile),
        worldSetting: toJsonBlock(body.worldSetting),
        powerSystem: toJsonBlock(body.powerSystem),
        mainPlot: toJsonBlock(body.mainPlot),
        earlyStageHighlights: toJsonBlock(body.earlyStageHighlights),
        styleRules: toJsonBlock(body.styleRules),
        lockedFields: toJsonBlock(body.lockedFields),
        version: 1,
      },
      update: {
        logline,
        synopsis,
        coreConflict,
        protagonistProfile: toJsonBlock(body.protagonistProfile) ?? { content: "" },
        supportingCast: toJsonBlock(body.supportingCast),
        antagonistProfile: toJsonBlock(body.antagonistProfile),
        worldSetting: toJsonBlock(body.worldSetting),
        powerSystem: toJsonBlock(body.powerSystem),
        mainPlot: toJsonBlock(body.mainPlot),
        earlyStageHighlights: toJsonBlock(body.earlyStageHighlights),
        styleRules: toJsonBlock(body.styleRules),
        lockedFields: toJsonBlock(body.lockedFields),
        version: (existing?.version ?? 0) + 1,
      },
    });

    return NextResponse.json({ storyBible });
  } catch (error) {
    console.error("Failed to save story bible", error);

    return NextResponse.json(
      { message: "保存故事设定失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
