import Image from "next/image";
import Link from "next/link";
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

export default async function PublicNovelsPage() {
  const [projects, recentUpdates] = await Promise.all([
    prisma.project.findMany({
      where: {
        isPublic: true,
        chapters: {
          some: {
            isPublished: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        publicSlug: true,
        publicTitle: true,
        title: true,
        publicIntro: true,
        publicCoverData: true,
        chapters: {
          where: { isPublished: true },
          orderBy: [{ chapterNo: "desc" }],
          take: 1,
          select: {
            chapterNo: true,
            publishedAt: true,
          },
        },
      },
    }),
    prisma.chapter.findMany({
      where: {
        isPublished: true,
        project: {
          isPublic: true,
        },
      },
      orderBy: [{ publishedAt: "desc" }],
      take: 8,
      select: {
        chapterNo: true,
        publishedAt: true,
        publishedTitle: true,
        title: true,
        project: {
          select: {
            publicSlug: true,
            publicTitle: true,
            title: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Novels</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">公开小说站</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            这里展示你已经发布出去的小说和章节。写作后台继续负责生成、改稿和发布。
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="grid gap-5 md:grid-cols-2">
              {projects.length ? (
                projects.map((project) => {
                const title = project.publicTitle ?? project.title;
                const intro = project.publicIntro ?? "这本书还没有公开简介。";
                const latestChapter = project.chapters[0];
                const slug = project.publicSlug ?? project.id;
                const latestUpdateText = latestChapter
                  ? `更新至第 ${latestChapter.chapterNo} 章 · ${formatPublishedAt(latestChapter.publishedAt ?? null)}`
                  : "还没有公开章节";

                  return (
                    <Link
                      key={project.id}
                      href={`/novels/${slug}`}
                      className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 transition hover:border-zinc-900"
                    >
                      <div className="aspect-[2/3] overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-zinc-50">
                        {project.publicCoverData ? (
                          <Image
                            src={project.publicCoverData}
                            alt={`${title} 封面`}
                            width={720}
                            height={1080}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                            暂无公开封面
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            连载中
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                            {latestUpdateText}
                          </span>
                        </div>
                        <h2 className="text-2xl font-semibold">{title}</h2>
                        <p className="mt-3 line-clamp-4 text-sm leading-7 text-zinc-600">{intro}</p>
                        <p className="mt-4 text-sm font-medium text-amber-700">
                          {latestChapter ? `最新章节：第 ${latestChapter.chapterNo} 章` : "还没有公开章节"}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
                  还没有公开小说。先回后台发布第一章。
                </div>
              )}
            </div>

            <aside className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Recent Updates</p>
              <h2 className="mt-2 text-2xl font-semibold">最近更新</h2>
              <div className="mt-4 space-y-3">
                {recentUpdates.length ? (
                  recentUpdates.map((chapter, index) => {
                    const slug = chapter.project.publicSlug ?? "";
                    const novelTitle = chapter.project.publicTitle ?? chapter.project.title;
                    return (
                      <Link
                        key={`${slug}-${chapter.chapterNo}-${index}`}
                        href={`/novels/${slug}/chapters/${chapter.chapterNo}`}
                        className="block rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-zinc-900"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-amber-700">
                          {formatPublishedAt(chapter.publishedAt ?? null)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-zinc-900">{novelTitle}</p>
                        <p className="mt-1 text-sm text-zinc-600">
                          第 {chapter.chapterNo} 章 · {chapter.publishedTitle ?? chapter.title}
                        </p>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-500">还没有最近更新。</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
