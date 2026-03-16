import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    characterId: string;
  }>;
};

type UploadBody = {
  imageData?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { characterId } = await context.params;
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
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ message: "找不到这个角色。" }, { status: 404 });
    }

    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        referenceImageData: imageData,
      },
    });

    return NextResponse.json({ character: updatedCharacter }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload character reference image", error);

    return NextResponse.json(
      { message: "上传角色参考图失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
