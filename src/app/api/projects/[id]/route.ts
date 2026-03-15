import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        storyBible: {
          select: {
            id: true,
            updatedAt: true,
            version: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "找不到这个作品。" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to load project", error);

    return NextResponse.json(
      { message: "读取作品失败，请检查数据库连接。" },
      { status: 500 },
    );
  }
}
