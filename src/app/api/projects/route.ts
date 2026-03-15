import { NextResponse } from "next/server";
import { OutputLanguage, TerminologyMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CreateProjectBody = {
  title?: string;
  genre?: string;
  premise?: string;
  tone?: string | null;
  targetWords?: number | null;
  defaultOutputLanguage?: OutputLanguage;
  terminologyMode?: TerminologyMode;
};

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        genre: true,
        premise: true,
        tone: true,
        status: true,
        currentChapterNo: true,
        targetWords: true,
        sourceLanguage: true,
        defaultOutputLanguage: true,
        terminologyMode: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to load projects", error);

    return NextResponse.json(
      {
        message:
          "暂时无法读取作品列表。请先确认 Supabase 环境变量和数据库连接已经配置好。",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: CreateProjectBody;

  try {
    body = (await request.json()) as CreateProjectBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const title = body.title?.trim();
  const genre = body.genre?.trim();
  const premise = body.premise?.trim();
  const tone = body.tone?.trim() || null;
  const targetWords =
    typeof body.targetWords === "number" && Number.isFinite(body.targetWords)
      ? Math.max(0, Math.floor(body.targetWords))
      : null;
  const defaultOutputLanguage =
    body.defaultOutputLanguage === OutputLanguage.MS_MY
      ? OutputLanguage.MS_MY
      : OutputLanguage.ZH_CN;
  const terminologyMode =
    body.terminologyMode &&
    Object.values(TerminologyMode).includes(body.terminologyMode)
      ? body.terminologyMode
      : TerminologyMode.KEEP_CN_TERMS;

  if (!title || !genre || !premise) {
    return NextResponse.json(
      { message: "请至少填写作品名、题材和核心脑洞。" },
      { status: 400 },
    );
  }

  try {
    const project = await prisma.project.create({
      data: {
        title,
        genre,
        premise,
        tone,
        targetWords,
        sourceLanguage: OutputLanguage.ZH_CN,
        defaultOutputLanguage,
        terminologyMode,
      },
      select: {
        id: true,
        title: true,
        genre: true,
        premise: true,
        tone: true,
        status: true,
        currentChapterNo: true,
        targetWords: true,
        sourceLanguage: true,
        defaultOutputLanguage: true,
        terminologyMode: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project", error);

    return NextResponse.json(
      { message: "创建作品失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
