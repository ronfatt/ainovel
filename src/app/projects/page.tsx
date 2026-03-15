"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

type ProjectCard = {
  id: string;
  title: string;
  genre: string;
  premise: string;
  tone: string | null;
  status: string;
  currentChapterNo: number;
  targetWords: number | null;
  updatedAt: string;
};

type ProjectForm = {
  title: string;
  genre: string;
  premise: string;
  tone: string;
  targetWords: string;
};

const emptyForm: ProjectForm = {
  title: "",
  genre: "",
  premise: "",
  tone: "",
  targetWords: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = (await response.json()) as {
        message?: string;
        projects?: ProjectCard[];
      };

      if (!response.ok) {
        throw new Error(data.message ?? "读取作品失败。");
      }

      setProjects(data.projects ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "读取作品失败，请稍后再试。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    startTransition(() => {
      void loadProjects();
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          genre: form.genre,
          premise: form.premise,
          tone: form.tone || null,
          targetWords: form.targetWords ? Number(form.targetWords) : null,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        project?: ProjectCard;
      };

      if (!response.ok || !data.project) {
        throw new Error(data.message ?? "创建作品失败。");
      }

      setProjects((current) => [data.project as ProjectCard, ...current]);
      setForm(emptyForm);
      setSuccess("作品已创建，现在可以进入故事设定页继续写。");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "创建作品失败，请稍后再试。",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdf7_0%,_#fff4de_38%,_#f3f4f6_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.4)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Projects</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">作品库</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
                先把每本书当成一个独立项目管理。这里先解决开书、查看进度、进入故事设定页这三个核心动作。
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
            >
              返回首页
            </Link>
          </div>

          <div className="mt-8 grid gap-4">
            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
                正在读取作品列表...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm leading-7 text-zinc-500">
                还没有作品。先在右侧创建第一本书，然后就可以进入故事设定页继续写作。
              </div>
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-[1.5rem] border border-amber-100 bg-amber-50/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                        {project.genre}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-700">{project.premise}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-600">
                    <span>当前章节：{project.currentChapterNo}</span>
                    <span>目标字数：{project.targetWords ?? "未设定"}</span>
                    <span>最近更新：{new Date(project.updatedAt).toLocaleString("zh-CN")}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${project.id}/story-bible`}
                      className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      进入故事设定
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-7 text-white shadow-[0_28px_80px_-44px_rgba(24,24,27,0.7)]">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-300">New Project</p>
          <h2 className="mt-3 text-3xl font-semibold">快速开一本新书</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            这里先收最核心的信息。后面故事设定页再把主角、世界观、系统、反派和爽点补全。
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">作品名</span>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
                placeholder="例如：我在高武世界无限顿悟"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">题材</span>
              <input
                value={form.genre}
                onChange={(event) => updateField("genre", event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
                placeholder="都市、玄幻、末世、重生、系统"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">核心脑洞</span>
              <textarea
                value={form.premise}
                onChange={(event) => updateField("premise", event.target.value)}
                className="min-h-32 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
                placeholder="一句话写清主角、设定和最大爽点。"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">风格偏好</span>
              <input
                value={form.tone}
                onChange={(event) => updateField("tone", event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
                placeholder="快节奏、热血、轻松、狠辣"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">目标字数</span>
              <input
                type="number"
                min="0"
                value={form.targetWords}
                onChange={(event) => updateField("targetWords", event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
                placeholder="500000"
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "创建中..." : "创建作品"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
