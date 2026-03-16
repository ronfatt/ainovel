import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicNovelsPage() {
  const projects = await prisma.project.findMany({
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
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Novels</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">公开小说站</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            这里展示你已经发布出去的小说和章节。写作后台继续负责生成、改稿和发布。
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.length ? (
              projects.map((project) => {
                const title = project.publicTitle ?? project.title;
                const intro = project.publicIntro ?? "这本书还没有公开简介。";
                const latestChapter = project.chapters[0];
                const slug = project.publicSlug ?? project.id;

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
                      <h2 className="text-2xl font-semibold">{title}</h2>
                      <p className="mt-3 line-clamp-4 text-sm leading-7 text-zinc-600">{intro}</p>
                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-amber-700">
                        {latestChapter
                          ? `已更新到第 ${latestChapter.chapterNo} 章`
                          : "还没有公开章节"}
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
        </div>
      </div>
    </main>
  );
}
