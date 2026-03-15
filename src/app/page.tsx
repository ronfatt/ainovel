import Link from "next/link";

export default function Home() {
  const setupSteps = [
    "在 Supabase 创建项目，并拿到 runtime 连接串、direct 连接串、Project URL 和 anon key。",
    "把 .env.example 复制成 .env，填入 DATABASE_URL、DIRECT_URL 和 Supabase 公钥。",
    "运行 prisma db push 或 prisma migrate dev，把第一版小说数据库结构同步到 Supabase。",
  ];

  const schemaModules = [
    "projects",
    "story_bibles",
    "outlines",
    "chapters",
    "chapter_briefs",
    "chapter_drafts",
    "characters",
    "world_rules",
    "foreshadows",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fde68a,_#fff7ed_32%,_#f8fafc_72%)] px-6 py-12 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-amber-200/60 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(120,53,15,0.45)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-700">
            AI Novel Workspace
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            中文爽文写作平台的第一阶段数据层已经就位。
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-700 sm:text-lg">
            这个仓库现在已经接好了 Next.js、Supabase 和 Prisma 的基础结构，接下来你只需要填入
            Supabase 环境变量，就可以开始建作品、故事设定、大纲、章节和正文草稿。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/projects"
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              进入作品库
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold">数据库模块</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Prisma schema 已经覆盖自用版写作 MVP 的核心实体，后面扩成公开平台也不用推倒重来。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {schemaModules.map((module) => (
                <span
                  key={module}
                  className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-950 p-7 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">下一步</h2>
            <ol className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">
              {setupSteps.map((step, index) => (
                <li key={step}>
                  <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 font-semibold text-zinc-950">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
