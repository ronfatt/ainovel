import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BriefBody = {
  opening?: string;
  conflict?: string;
  payoff?: string;
  twist?: string;
  endingHook?: string;
  notes?: string;
};

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;

  let body: BriefBody;

  try {
    body = (await request.json()) as BriefBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const briefData = {
    opening: body.opening?.trim() ?? "",
    conflict: body.conflict?.trim() ?? "",
    payoff: body.payoff?.trim() ?? "",
    twist: body.twist?.trim() ?? "",
    endingHook: body.endingHook?.trim() ?? "",
  };

  if (!briefData.opening && !briefData.conflict && !briefData.payoff && !briefData.twist) {
    return NextResponse.json({ message: "章节细纲不能为空。" }, { status: 400 });
  }

  try {
    const lastBrief = await prisma.chapterBrief.findFirst({
      where: { chapterId },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });

    const brief = await prisma.$transaction(async (tx) => {
      await tx.chapterBrief.updateMany({
        where: { chapterId, isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.chapterBrief.create({
        data: {
          chapterId,
          briefData,
          notes: body.notes?.trim() || null,
          version: (lastBrief?.version ?? 0) + 1,
          isCurrent: true,
        },
      });
    });

    return NextResponse.json({ brief }, { status: 201 });
  } catch (error) {
    console.error("Failed to save chapter brief", error);

    return NextResponse.json(
      { message: "保存章节细纲失败，请确认数据库已经连上 Supabase。" },
      { status: 500 },
    );
  }
}
