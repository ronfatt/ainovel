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

type EditableChapter = {
  id: string;
  chapterNo: number;
  volumeNo: number;
  title: string;
  summary: string;
  corePayoff: string;
  endingHook: string;
  wordCountTarget: string;
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
  const [editableChapters, setEditableChapters] = useState<EditableChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toEditable(chapter: ChapterItem): EditableChapter {
    return {
      id: chapter.id,
      chapterNo: chapter.chapterNo,
      volumeNo: chapter.volumeNo,
      title: chapter.title,
      summary: chapter.summary,
      corePayoff: chapter.corePayoff ?? "",
      endingHook: chapter.endingHook ?? "",
      wordCountTarget: chapter.wordCountTarget ? String(chapter.wordCountTarget) : "",
    };
  }

  function normalizeChapterNumbers(items: EditableChapter[]) {
    return items.map((item, index) => ({
      ...item,
      chapterNo: index + 1,
    }));
  }

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
    // We intentionally reload only when the route param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setEditableChapters((data.chapters ?? []).map(toEditable));
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

      setEditableChapters(data.chapters.map(toEditable));
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

  function updateChapterField<K extends keyof EditableChapter>(
    index: number,
    key: K,
    value: EditableChapter[K],
  ) {
    setEditableChapters((current) =>
      current.map((chapter, chapterIndex) =>
        chapterIndex === index
          ? {
              ...chapter,
              [key]: value,
            }
          : chapter,
      ),
    );
  }

  function insertChapterAfter(index: number) {
    setEditableChapters((current) => {
      const next = [...current];
      const after = current[index];
      next.splice(index + 1, 0, {
        id: `draft-${crypto.randomUUID()}`,
        chapterNo: after.chapterNo + 1,
        volumeNo: after.volumeNo,
        title: "新章节标题",
        summary: "",
        corePayoff: "",
        endingHook: "",
        wordCountTarget: after.wordCountTarget || "1800",
      });

      return normalizeChapterNumbers(next);
    });
  }

  function removeChapter(index: number) {
    setEditableChapters((current) => {
      if (current.length <= 1) {
        return current;
      }

      return normalizeChapterNumbers(current.filter((_, chapterIndex) => chapterIndex !== index));
    });
  }

  function moveChapter(index: number, direction: "up" | "down") {
    setEditableChapters((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [chapter] = next.splice(index, 1);
      next.splice(targetIndex, 0, chapter);

      return normalizeChapterNumbers(next);
    });
  }

  async function handleSaveChapters() {
    if (!projectId) {
      setError("项目 ID 缺失。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = editableChapters.map((chapter) => ({
        chapterNo: chapter.chapterNo,
        volumeNo: chapter.volumeNo,
        title: chapter.title,
        summary: chapter.summary,
        corePayoff: chapter.corePayoff || null,
        endingHook: chapter.endingHook || null,
        wordCountTarget: chapter.wordCountTarget ? Number(chapter.wordCountTarget) : null,
      }));

      const response = await fetch(`/api/projects/${projectId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: payload }),
      });

      const data = (await response.json()) as {
        message?: string;
        chapters?: ChapterItem[];
      };

      if (!response.ok || !data.chapters) {
        throw new Error(data.message ?? "保存章节目录失败。");
      }

      setEditableChapters(data.chapters.map(toEditable));
      setSuccess("章节目录已保存。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存章节目录失败。");
    } finally {
      setSaving(false);
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
            <button
              type="button"
              onClick={handleSaveChapters}
              disabled={saving || editableChapters.length === 0}
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存目录修改"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

          <div className="mt-8 grid gap-4">
            {loading ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
                正在读取章节目录...
              </div>
            ) : editableChapters.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm leading-7 text-zinc-500">
                还没有章节目录。先生成一版目录，再进入单章写作页生成正文。
              </div>
            ) : (
              editableChapters.map((chapter, index) => (
                <article
                  key={chapter.id}
                  className="rounded-[1.5rem] border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                        第 {chapter.chapterNo} 章
                      </p>
                      <input
                        value={chapter.title}
                        onChange={(event) =>
                          updateChapterField(index, "title", event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-2xl font-semibold outline-none transition focus:border-amber-400"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveChapter(index, "up")}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChapter(index, "down")}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        onClick={() => insertChapterAfter(index)}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                      >
                        后插一章
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChapter(index)}
                        className="rounded-full border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-500 hover:text-rose-700"
                      >
                        删除
                      </button>
                      {chapter.id.startsWith("draft-") ? null : (
                        <Link
                          href={`/projects/${projectId}/chapters/${chapter.id}`}
                          className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                        >
                          进入写作页
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
                        章节摘要
                      </span>
                      <textarea
                        rows={3}
                        value={chapter.summary}
                        onChange={(event) =>
                          updateChapterField(index, "summary", event.target.value)
                        }
                        className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                      />
                    </label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
                          本章爽点
                        </span>
                        <textarea
                          rows={3}
                          value={chapter.corePayoff}
                          onChange={(event) =>
                            updateChapterField(index, "corePayoff", event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
                          结尾钩子
                        </span>
                        <textarea
                          rows={3}
                          value={chapter.endingHook}
                          onChange={(event) =>
                            updateChapterField(index, "endingHook", event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
                          目标字数
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={chapter.wordCountTarget}
                          onChange={(event) =>
                            updateChapterField(index, "wordCountTarget", event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none transition focus:border-amber-400"
                        />
                      </label>
                    </div>
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
