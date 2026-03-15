import { NextResponse } from "next/server";
import { buildReferenceImagePrompt } from "@/lib/character-visual";
import { generateImage } from "@/lib/openai-image";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    characterId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { characterId } = await context.params;

  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ message: "找不到这个角色。" }, { status: 404 });
    }

    const profileSummary =
      ((character.profile as { summary?: string } | null)?.summary ?? "").trim() || null;
    const prompt = buildReferenceImagePrompt({
      name: character.name,
      role: character.role,
      profileSummary,
      appearancePromptZh: character.appearancePromptZh,
      appearancePromptEn: character.appearancePromptEn,
      identityLockNotes: character.identityLockNotes,
      negativePrompt: character.negativePrompt,
    });

    const generated = await generateImage({
      prompt: `${prompt} Project title: ${character.project.title}.`,
      size: "1024x1536",
      quality: "high",
    });

    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        referenceImageData: generated.imageData,
      },
    });

    return NextResponse.json({
      character: updatedCharacter,
      model: generated.model,
    });
  } catch (error) {
    console.error("Failed to generate character reference image", error);

    return NextResponse.json(
      { message: "AI 生成角色参考图失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
