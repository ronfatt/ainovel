import { NextResponse } from "next/server";
import { CharacterRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    characterId: string;
  }>;
};

type UpdateCharacterBody = {
  name?: string;
  role?: CharacterRole;
  profileSummary?: string;
  appearancePromptZh?: string;
  appearancePromptEn?: string;
  negativePrompt?: string;
  identityLockNotes?: string;
  notes?: string;
  isVisualAnchor?: boolean;
};

export async function PUT(request: Request, context: RouteContext) {
  const { characterId } = await context.params;
  let body: UpdateCharacterBody;

  try {
    body = (await request.json()) as UpdateCharacterBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  try {
    const existing = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        projectId: true,
        profile: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "找不到这个角色。" }, { status: 404 });
    }

    if (body.isVisualAnchor) {
      await prisma.character.updateMany({
        where: {
          projectId: existing.projectId,
          id: { not: characterId },
        },
        data: {
          isVisualAnchor: false,
        },
      });
    }

    const currentProfile = (existing.profile as { summary?: string } | null) ?? {};
    const character = await prisma.character.update({
      where: { id: characterId },
      data: {
        name: body.name?.trim() || undefined,
        role: Object.values(CharacterRole).includes(body.role as CharacterRole)
          ? (body.role as CharacterRole)
          : undefined,
        profile: {
          ...currentProfile,
          summary: body.profileSummary ?? currentProfile.summary ?? "",
        },
        appearancePromptZh: body.appearancePromptZh ?? undefined,
        appearancePromptEn: body.appearancePromptEn ?? undefined,
        negativePrompt: body.negativePrompt ?? undefined,
        identityLockNotes: body.identityLockNotes ?? undefined,
        notes: body.notes ?? undefined,
        isVisualAnchor: body.isVisualAnchor ?? undefined,
      },
    });

    return NextResponse.json({ character });
  } catch (error) {
    console.error("Failed to update character", error);

    return NextResponse.json(
      { message: "保存角色形象失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
