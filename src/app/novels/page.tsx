import Image from "next/image";
import Link from "next/link";
import { OutputLanguage } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatPublicChapterLabel,
  formatPublicPublishedAt,
  getPublicReaderCopy,
} from "@/lib/public-reader-language";

export const dynamic = "force-dynamic";

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
        defaultOutputLanguage: true,
        publicIntro: true,
        publicCoverData: true,
        chapters: {
          where: { isPublished: true },
          orderBy: [{ chapterNo: "desc" }],
          take: 1,
          select: {
            chapterNo: true,
            publishedAt: true,
            publishedCoverData: true,
            covers: {
              where: { isPrimary: true },
              orderBy: [{ updatedAt: "desc" }],
              take: 1,
              select: {
                imageData: true,
              },
            },
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
            defaultOutputLanguage: true,
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
                const copy = getPublicReaderCopy(project.defaultOutputLanguage);
                const title = project.publicTitle ?? project.title;
                const intro = project.publicIntro ?? copy.noPublicIntro;
                const latestChapter = project.chapters[0];
                const slug = project.publicSlug ?? project.id;
                const coverData =
                  project.publicCoverData ??
                  latestChapter?.publishedCoverData ??
                  latestChapter?.covers[0]?.imageData ??
                  null;
                const latestUpdateText = latestChapter
                  ? `${copy.latestUpdatePrefix}: ${formatPublicChapterLabel(latestChapter.chapterNo, project.defaultOutputLanguage)} · ${formatPublicPublishedAt(latestChapter.publishedAt ?? null, project.defaultOutputLanguage)}`
                  : copy.noPublicChapter;

                  return (
                    <Link
                      key={project.id}
                      href={`/novels/${slug}`}
                      className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 transition hover:border-zinc-900"
                    >
                      <div className="aspect-[2/3] overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-zinc-50">
                        {coverData ? (
                          <Image
                            src={coverData}
                            alt={`${title} 封面`}
                            width={720}
                            height={1080}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                            {copy.noCover}
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            {copy.statusSerializing}
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                            {latestUpdateText}
                          </span>
                        </div>
                        <h2 className="text-2xl font-semibold">{title}</h2>
                        <p className="mt-3 line-clamp-4 text-sm leading-7 text-zinc-600">{intro}</p>
                        <p className="mt-4 text-sm font-medium text-amber-700">
                          {latestChapter
                            ? `${copy.latestChapterPrefix}: ${formatPublicChapterLabel(latestChapter.chapterNo, project.defaultOutputLanguage)}`
                            : copy.noPublicChapter}
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
                    const language = chapter.project.defaultOutputLanguage ?? OutputLanguage.ZH_CN;
                    return (
                      <Link
                        key={`${slug}-${chapter.chapterNo}-${index}`}
                        href={`/novels/${slug}/chapters/${chapter.chapterNo}`}
                        className="block rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-zinc-900"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-amber-700">
                          {formatPublicPublishedAt(chapter.publishedAt ?? null, language)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-zinc-900">{novelTitle}</p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {formatPublicChapterLabel(chapter.chapterNo, language)} · {chapter.publishedTitle ?? chapter.title}
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
