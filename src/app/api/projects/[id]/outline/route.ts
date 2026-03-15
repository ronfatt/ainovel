import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type OutlineBody = {
  title?: string;
  summary?: string;
  openingHook?: string;
  volumePlan?: string;
  midpointTwist?: string;
  finaleDirection?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toStructureData(body: OutlineBody): Prisma.InputJsonValue {
  return {
    openingHook: body.openingHook?.trim() ?? "",
    volumePlan: body.volumePlan?.trim() ?? "",
    midpointTwist: body.midpointTwist?.trim() ?? "",
    finaleDirection: body.finaleDirection?.trim() ?? "",
  };
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
        storyBible: {
          select: {
            id: true,
            logline: true,
            synopsis: true,
            coreConflict: true,
            version: true,
          },
        },
        outline: true,
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    return NextResponse.json({
      project,
      outline: project.outline,
    });
  } catch (error) {
    console.error("Failed to load outline", error);

    return NextResponse.json(
      { message: "读取大纲失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: OutlineBody;

  try {
    body = (await request.json()) as OutlineBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const summary = body.summary?.trim();

  if (!summary) {
    return NextResponse.json({ message: "请至少填写大纲摘要。" }, { status: 400 });
  }

  try {
    const existing = await prisma.outline.findUnique({
      where: { projectId: id },
      select: { version: true },
    });

    const outline = await prisma.outline.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        title: body.title?.trim() || null,
        summary,
        structureData: toStructureData(body),
        version: 1,
      },
      update: {
        title: body.title?.trim() || null,
        summary,
        structureData: toStructureData(body),
        version: (existing?.version ?? 0) + 1,
      },
    });

    return NextResponse.json({ outline });
  } catch (error) {
    console.error("Failed to save outline", error);

    return NextResponse.json(
      { message: "保存大纲失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
