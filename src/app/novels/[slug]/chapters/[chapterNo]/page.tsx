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
        publicSlug: slug,
        isPublic: true,
      },
    },
    select: {
      chapterNo: true,
      publishedTitle: true,
      title: true,
      publishedContent: true,
      publishedCoverData: true,
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

  const novelTitle = chapter.project.publicTitle ?? chapter.project.title;
  const chapterTitle = chapter.publishedTitle ?? chapter.title;

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
        </div>
      </div>
    </main>
  );
}
