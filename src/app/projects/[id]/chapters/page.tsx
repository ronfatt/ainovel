"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { getOutputLanguageLabel, getTerminologyModeLabel } from "@/lib/project-language";

type ChapterItem = {
  id: string;
  chapterNo: number;
  volumeNo: number;
  title: string;
  summary: string;
  corePayoff: string | null;
  endingHook: string | null;
  wordCountTarget: number | null;
};

type ProjectPayload = {
  id: string;
  title: string;
  genre: string;
  premise: string;
  tone: string | null;
  sourceLanguage: string;
  defaultOutputLanguage: string;
  terminologyMode: string;
  outline: {
    id: string;
    title: string | null;
    summary: string | null;
    version: number;
  } | null;
};

export default function ChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      void params.then(({ id }) => setProjectId(id));
    });
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    startTransition(() => {
      void loadChapters(projectId);
    });
  }, [projectId]);

  async function loadChapters(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/chapters`, { cache: "no-store" });
      const data = (await response.json()) as {
        message?: string;
        project?: ProjectPayload;
        chapters?: ChapterItem[];
      };

      if (!response.ok || !data.project) {
        throw new Error(data.message ?? "读取章节目录失败。");
      }

      setProject(data.project);
      setChapters(data.chapters ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取章节目录失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateChapters() {
    if (!projectId) {
      setError("项目 ID 缺失。");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/ai/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await response.json()) as {
        message?: string;
        chapters?: ChapterItem[];
        model?: string;
      };

      if (!response.ok || !data.chapters) {
        throw new Error(data.message ?? "AI 生成章节目录失败。");
      }

      setChapters(data.chapters);
      setSuccess(`AI 已生成章节目录，当前模型：${data.model ?? "未返回"}`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "AI 生成章节目录失败。",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Chapters</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {project?.title ?? "章节目录页"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                这里用中文母稿生成章节目录，再进入单章写作页按中文或马来文输出正文。
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={projectId ? `/projects/${projectId}/outline` : "/projects"}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回大纲页
              </Link>
            </div>
          </div>

          {project ? (
            <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">默认输出</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {getOutputLanguageLabel(project.defaultOutputLanguage)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">术语策略</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {getTerminologyModeLabel(project.terminologyMode)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">大纲标题</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {project.outline?.title ?? "还没有大纲"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">大纲版本</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {project.outline?.version ?? "未生成"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateChapters}
              disabled={generating || !project?.outline}
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "AI 生成中..." : "AI 生成章节目录"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

          <div className="mt-8 grid gap-4">
            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
                正在读取章节目录...
              </div>
            ) : chapters.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm leading-7 text-zinc-500">
                还没有章节目录。先生成一版目录，再进入单章写作页生成正文。
              </div>
            ) : (
              chapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="rounded-[1.5rem] border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                        第 {chapter.chapterNo} 章
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">{chapter.title}</h2>
                    </div>
                    <Link
                      href={`/projects/${projectId}/chapters/${chapter.id}`}
                      className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      进入写作页
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-700">{chapter.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-600">
                    <span>本章爽点：{chapter.corePayoff ?? "未设置"}</span>
                    <span>结尾钩子：{chapter.endingHook ?? "未设置"}</span>
                    <span>目标字数：{chapter.wordCountTarget ?? "未设置"}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
