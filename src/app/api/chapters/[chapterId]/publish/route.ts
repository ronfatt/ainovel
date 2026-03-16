import { NextResponse } from "next/server";
import { OutputLanguage } from "@/generated/prisma/client";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { createPublicSlug } from "@/lib/public-slug";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type PublishBody = {
  content?: string;
  outputLanguage?: OutputLanguage;
};

export async function POST(request: Request, context: RouteContext) {
  const { chapterId } = await context.params;
  let body: PublishBody;

  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ message: "请先准备好正文，再发布本章。" }, { status: 400 });
  }

  const outputLanguage =
    body.outputLanguage === OutputLanguage.MS_MY ? OutputLanguage.MS_MY : OutputLanguage.ZH_CN;

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            publicSlug: true,
            publicTitle: true,
            defaultOutputLanguage: true,
            storyBible: {
              select: {
                synopsis: true,
              },
            },
          },
        },
        covers: {
          where: { isPrimary: true },
          take: 1,
          select: {
            imageData: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ message: "找不到这个章节。" }, { status: 404 });
    }

    const primaryCoverData = chapter.covers[0]?.imageData ?? null;
    const storySynopsis = chapter.project.storyBible?.synopsis?.trim() ?? "";
    const initialSlug =
      chapter.project.publicSlug ?? createPublicSlug(chapter.project.title, chapter.project.id);

    let publicSlug = initialSlug;
    let suffix = 1;

    while (true) {
      const conflict = await prisma.project.findFirst({
        where: {
          publicSlug,
          id: { not: chapter.project.id },
        },
        select: { id: true },
      });

      if (!conflict) {
        break;
      }

      suffix += 1;
      publicSlug = `${initialSlug}-${suffix}`;
    }

    const publishedAt = new Date();
    let publicTitle = chapter.project.publicTitle ?? chapter.project.title;
    let publishedTitle = chapter.title;
    let publicIntro = storySynopsis || null;

    if (outputLanguage === OutputLanguage.MS_MY) {
      try {
        const client = getOpenAIClient();
        const translationResponse = await client.responses.create({
          model: getOpenAIModel(),
          reasoning: {
            effort: "low",
          },
          instructions:
            "You localize Chinese web novel metadata into natural Malay for public readers. Keep proper nouns and cultivation/system terms recognizable, but write fluent Malay. Output only valid JSON.",
          input: [
            `Novel title: ${chapter.project.title}`,
            `Chapter title: ${chapter.title}`,
            `Chinese novel intro: ${storySynopsis}`,
            "Return a Malay public novel title, a Malay chapter title, and a 2-3 sentence Malay public intro.",
          ].join("\n"),
          text: {
            format: {
              type: "json_schema",
              name: "public_localization",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  publicTitle: { type: "string" },
                  chapterTitle: { type: "string" },
                  publicIntro: { type: "string" },
                },
                required: ["publicTitle", "chapterTitle", "publicIntro"],
              },
            },
          },
          max_output_tokens: 800,
        });

        if (translationResponse.output_text) {
          const localized = JSON.parse(translationResponse.output_text) as {
            publicTitle: string;
            chapterTitle: string;
            publicIntro: string;
          };
          publicTitle = localized.publicTitle.trim() || publicTitle;
          publishedTitle = localized.chapterTitle.trim() || publishedTitle;
          publicIntro = localized.publicIntro.trim() || publicIntro;
        }
      } catch (translationError) {
        console.error("Failed to localize public metadata", translationError);
        publicIntro = content.slice(0, 180).trim() || publicIntro;
      }
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { id: chapter.project.id },
        data: {
          isPublic: true,
          publicSlug,
          publicTitle,
          publicIntro,
          publicCoverData: primaryCoverData ?? undefined,
        },
      }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          isPublished: true,
          publishedAt,
          publishedTitle,
          publishedContent: content,
          publishedCoverData: primaryCoverData,
        },
      }),
    ]);

    return NextResponse.json({
      message: "本章已发布。",
      publicPath: `/novels/${publicSlug}/chapters/${chapter.chapterNo}`,
      publicSlug,
      chapterNo: chapter.chapterNo,
    });
  } catch (error) {
    console.error("Failed to publish chapter", error);

    return NextResponse.json(
      { message: "发布本章失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
