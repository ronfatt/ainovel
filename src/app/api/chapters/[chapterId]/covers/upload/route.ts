import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPublishedChapterCover } from "@/lib/public-cover-sync";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type UploadBody = {
  imageData?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;
  let body: UploadBody;

  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const imageData = body.imageData?.trim();
  if (!imageData?.startsWith("data:image/")) {
    return NextResponse.json({ message: "请上传有效的图片文件。" }, { status: 400 });
  }

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    const hasPrimary = await prisma.chapterCover.findFirst({
      where: {
        chapterId,
        isPrimary: true,
      },
      select: { id: true },
    });

    const mimeType = imageData.slice(5, imageData.indexOf(";")) || "image/png";
    const cover = await prisma.chapterCover.create({
      data: {
        chapterId,
        scenePrompt: "手动上传封面",
        shotPrompt: "用户上传",
        moodPrompt: "手动上传",
        finalPrompt: "manual_upload",
        imageData,
        mimeType,
        modelName: "manual_upload",
        isPrimary: !hasPrimary,
      },
    });

    if (cover.isPrimary) {
      await syncPublishedChapterCover(chapterId);
    }

    return NextResponse.json({ cover }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload chapter cover", error);

    return NextResponse.json(
      { message: "上传章节封面失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
