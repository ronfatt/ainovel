import { NextResponse } from "next/server";
import { CharacterRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CharacterProfile = {
  summary?: string;
};

type CreateCharacterBody = {
  name?: string;
  role?: CharacterRole;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        characters: {
          orderBy: [{ isVisualAnchor: "desc" }, { updatedAt: "desc" }],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    return NextResponse.json({ project, characters: project.characters });
  } catch (error) {
    console.error("Failed to load project characters", error);

    return NextResponse.json(
      { message: "读取角色形象库失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: CreateCharacterBody;

  try {
    body = (await request.json()) as CreateCharacterBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const name = body.name?.trim() || "主角";
  const role = Object.values(CharacterRole).includes(body.role as CharacterRole)
    ? (body.role as CharacterRole)
    : CharacterRole.PROTAGONIST;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, characters: { select: { id: true }, take: 1 } },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    const character = await prisma.character.create({
      data: {
        projectId: id,
        name,
        role,
        isVisualAnchor: project.characters.length === 0,
        profile: {
          summary: "",
        } satisfies CharacterProfile,
      },
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error("Failed to create character", error);

    return NextResponse.json(
      { message: "创建角色失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
