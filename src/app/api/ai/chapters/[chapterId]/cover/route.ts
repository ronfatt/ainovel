import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildChapterCoverPrompt } from "@/lib/character-visual";
import { generateImage } from "@/lib/openai-image";
import { syncPublishedChapterCover } from "@/lib/public-cover-sync";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type GenerateCoverBody = {
  characterId?: string;
  scenePrompt?: string;
  shotPrompt?: string;
  moodPrompt?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;
  let body: GenerateCoverBody;

  try {
    body = (await request.json()) as GenerateCoverBody;
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
            characters: {
              orderBy: [{ isVisualAnchor: "desc" }, { updatedAt: "desc" }],
            },
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    const selectedCharacter =
      chapter.project.characters.find((character) => character.id === body.characterId) ??
      chapter.project.characters.find((character) => character.isVisualAnchor) ??
      chapter.project.characters.find((character) => character.role === "PROTAGONIST") ??
      null;

    if (!selectedCharacter) {
      return NextResponse.json(
        { message: "请先在角色形象页创建主角，并锁定一张参考图。" },
        { status: 400 },
      );
    }

    if (!selectedCharacter.referenceImageData) {
      return NextResponse.json(
        { message: "当前角色还没有参考图。请先在角色形象页生成并锁定参考图。" },
        { status: 400 },
      );
    }

    const profileSummary =
      ((selectedCharacter.profile as { summary?: string } | null)?.summary ?? "").trim() || null;
    const finalPrompt = buildChapterCoverPrompt({
      projectTitle: chapter.project.title,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      corePayoff: chapter.corePayoff,
      endingHook: chapter.endingHook,
      name: selectedCharacter.name,
      role: selectedCharacter.role,
      profileSummary,
      appearancePromptZh: selectedCharacter.appearancePromptZh,
      appearancePromptEn: selectedCharacter.appearancePromptEn,
      identityLockNotes: selectedCharacter.identityLockNotes,
      negativePrompt: selectedCharacter.negativePrompt,
      scenePrompt: body.scenePrompt?.trim() || chapter.summary,
      shotPrompt: body.shotPrompt?.trim() || "竖版封面，电影感半身或近景，角色主体清晰",
      moodPrompt:
        body.moodPrompt?.trim() ||
        chapter.corePayoff ||
        chapter.endingHook ||
        "高压、悬念、即将爆发",
    });

    const generated = await generateImage({
      prompt: finalPrompt,
      referenceImageData: selectedCharacter.referenceImageData,
      size: "1024x1536",
      quality: "high",
    });

    const existingPrimaryCover = await prisma.chapterCover.findFirst({
      where: {
        chapterId,
        isPrimary: true,
      },
      select: { id: true },
    });

    const cover = await prisma.chapterCover.create({
      data: {
        chapterId,
        characterId: selectedCharacter.id,
        scenePrompt: body.scenePrompt?.trim() || chapter.summary,
        shotPrompt:
          body.shotPrompt?.trim() || "竖版封面，电影感半身或近景，角色主体清晰",
        moodPrompt:
          body.moodPrompt?.trim() ||
          chapter.corePayoff ||
          chapter.endingHook ||
          "高压、悬念、即将爆发",
        finalPrompt,
        negativePrompt: selectedCharacter.negativePrompt,
        imageData: generated.imageData,
        mimeType: generated.mimeType,
        modelName: generated.model,
        isPrimary: !existingPrimaryCover,
      },
    });

    if (cover.isPrimary) {
      await syncPublishedChapterCover(chapterId);
    }

    return NextResponse.json({
      cover,
      model: generated.model,
    });
  } catch (error) {
    console.error("Failed to generate chapter cover", error);

    return NextResponse.json(
      { message: "AI 生成章节封面失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
