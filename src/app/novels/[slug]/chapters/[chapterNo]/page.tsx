import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    chapterNo: string;
  }>;
};

export default async function PublicChapterPage({ params }: PageProps) {
  const { slug, chapterNo } = await params;
  const parsedChapterNo = Number(chapterNo);

  if (!Number.isInteger(parsedChapterNo) || parsedChapterNo < 1) {
    notFound();
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      chapterNo: parsedChapterNo,
      isPublished: true,
      project: {
        isPublic: true,
        OR: [{ publicSlug: slug }, { id: slug }],
      },
    },
    select: {
      projectId: true,
      chapterNo: true,
      publishedTitle: true,
      title: true,
      publishedContent: true,
      publishedCoverData: true,
      publicViewCount: true,
      project: {
        select: {
          publicTitle: true,
          title: true,
        },
      },
    },
  });

  if (!chapter || !chapter.publishedContent) {
    notFound();
  }

  await prisma.chapter.update({
    where: {
      projectId_chapterNo: {
        projectId: chapter.projectId,
        chapterNo: chapter.chapterNo,
      },
    },
    data: {
      publicViewCount: {
        increment: 1,
      },
    },
  });

  const novelTitle = chapter.project.publicTitle ?? chapter.project.title;
  const chapterTitle = chapter.publishedTitle ?? chapter.title;
  const [previousChapter, nextChapter] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        projectId: chapter.projectId,
        isPublished: true,
        chapterNo: { lt: chapter.chapterNo },
      },
      orderBy: [{ chapterNo: "desc" }],
      select: {
        chapterNo: true,
        publishedTitle: true,
        title: true,
      },
    }),
    prisma.chapter.findFirst({
      where: {
        projectId: chapter.projectId,
        isPublished: true,
        chapterNo: { gt: chapter.chapterNo },
      },
      orderBy: [{ chapterNo: "asc" }],
      select: {
        chapterNo: true,
        publishedTitle: true,
        title: true,
      },
    }),
  ]);
  const displayedViewCount = chapter.publicViewCount + 1;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">{novelTitle}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                第 {chapter.chapterNo} 章 · {chapterTitle}
              </h1>
              <p className="mt-3 text-sm text-zinc-500">阅读量：{displayedViewCount}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/novels/${slug}`}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回目录
              </Link>
              <Link
                href="/novels"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回书库
              </Link>
            </div>
          </div>

          {chapter.publishedCoverData ? (
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50">
              <Image
                src={chapter.publishedCoverData}
                alt={`${chapterTitle} 封面`}
                width={1280}
                height={720}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          <article className="prose prose-zinc mt-10 max-w-none whitespace-pre-wrap text-lg leading-9 text-zinc-800">
            {chapter.publishedContent}
          </article>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
            {previousChapter ? (
              <Link
                href={`/novels/${slug}/chapters/${previousChapter.chapterNo}`}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                上一章 · 第 {previousChapter.chapterNo} 章
              </Link>
            ) : (
              <span className="rounded-full border border-dashed border-zinc-300 px-5 py-3 text-sm text-zinc-400">
                已经是第一章
              </span>
            )}

            <Link
              href={`/novels/${slug}`}
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
            >
              返回章节目录
            </Link>

            {nextChapter ? (
              <Link
                href={`/novels/${slug}/chapters/${nextChapter.chapterNo}`}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                下一章 · 第 {nextChapter.chapterNo} 章
              </Link>
            ) : (
              <span className="rounded-full border border-dashed border-zinc-300 px-5 py-3 text-sm text-zinc-400">
                已经是最新章
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
