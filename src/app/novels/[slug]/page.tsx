import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatPublishedAt(value: Date | null) {
  if (!value) {
    return "刚刚更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicNovelDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: {
      publicSlug: slug,
      isPublic: true,
      chapters: {
        some: { isPublished: true },
      },
    },
    select: {
      id: true,
      publicTitle: true,
      title: true,
      publicIntro: true,
      publicCoverData: true,
      chapters: {
        where: { isPublished: true },
        orderBy: [{ chapterNo: "asc" }],
        select: {
          id: true,
          chapterNo: true,
          publishedTitle: true,
          title: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const title = project.publicTitle ?? project.title;
  const latestChapter = project.chapters.at(-1) ?? null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50">
              {project.publicCoverData ? (
                <Image
                  src={project.publicCoverData}
                  alt={`${title} 封面`}
                  width={720}
                  height={1080}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center px-6 text-center text-sm text-zinc-500">
                  暂无公开封面
                </div>
              )}
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Public Novel</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  连载中
                </span>
                {latestChapter ? (
                  <span className="text-sm text-zinc-600">
                    最新更新：第 {latestChapter.chapterNo} 章 ·{" "}
                    {formatPublishedAt(latestChapter.publishedAt ?? null)}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-8 text-zinc-600">
                {project.publicIntro ?? "这本书还没有公开简介。"}
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">章节目录</h2>
                  <Link
                    href="/novels"
                    className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                  >
                    返回书库
                  </Link>
                </div>
                <div className="mt-4 grid gap-3">
                  {project.chapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={`/novels/${slug}/chapters/${chapter.chapterNo}`}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-zinc-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                            第 {chapter.chapterNo} 章
                          </p>
                          <p className="mt-2 text-lg font-semibold text-zinc-900">
                            {chapter.publishedTitle ?? chapter.title}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {formatPublishedAt(chapter.publishedAt ?? null)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
