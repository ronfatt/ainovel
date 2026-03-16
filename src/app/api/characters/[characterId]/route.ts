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

export async function DELETE(_: Request, context: RouteContext) {
  const { characterId } = await context.params;

  try {
    const existing = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        projectId: true,
        isVisualAnchor: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "找不到这个角色。" }, { status: 404 });
    }

    const siblingCharacters = await prisma.character.findMany({
      where: {
        projectId: existing.projectId,
        id: { not: characterId },
      },
      orderBy: [{ isVisualAnchor: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
      },
    });

    if (existing.isVisualAnchor && siblingCharacters.length === 0) {
      return NextResponse.json(
        { message: "这是当前唯一的视觉锚点角色，不能直接删除。请先创建另一个角色。" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existing.isVisualAnchor && siblingCharacters.length > 0) {
        await tx.character.update({
          where: { id: siblingCharacters[0].id },
          data: { isVisualAnchor: true },
        });
      }

      await tx.character.delete({
        where: { id: characterId },
      });
    });

    return NextResponse.json({ message: "角色已删除。" });
  } catch (error) {
    console.error("Failed to delete character", error);

    return NextResponse.json(
      { message: "删除角色失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
