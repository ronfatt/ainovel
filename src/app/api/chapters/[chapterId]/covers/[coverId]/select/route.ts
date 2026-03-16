import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    chapterId: string;
    coverId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { chapterId, coverId } = await context.params;

  try {
    const cover = await prisma.chapterCover.findFirst({
      where: {
        id: coverId,
        chapterId,
      },
      select: {
        id: true,
      },
    });

    if (!cover) {
      return NextResponse.json({ message: "找不到这个封面。" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.chapterCover.updateMany({
        where: {
          chapterId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      }),
      prisma.chapterCover.update({
        where: { id: coverId },
        data: {
          isPrimary: true,
        },
      }),
    ]);

    return NextResponse.json({ message: "已设为本章正式封面。" });
  } catch (error) {
    console.error("Failed to set primary chapter cover", error);

    return NextResponse.json(
      { message: "设置正式封面失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
