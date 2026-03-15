"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import {
  getOutputLanguageLabel,
  getTerminologyModeLabel,
  outputLanguageOptions,
  type OutputLanguageValue,
} from "@/lib/project-language";

type DraftItem = {
  id: string;
  draftNo: number;
  language: OutputLanguageValue;
  generationMode: string | null;
  content: string;
  wordCount: number;
  createdAt: string;
};

type ChapterPayload = {
  id: string;
  chapterNo: number;
  title: string;
  summary: string;
  corePayoff: string | null;
  endingHook: string | null;
  wordCountTarget: number | null;
  project: {
    id: string;
    title: string;
    defaultOutputLanguage: OutputLanguageValue;
    terminologyMode: string;
  };
  drafts: DraftItem[];
};

export default function ChapterWriterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [chapter, setChapter] = useState<ChapterPayload | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguageValue>("ZH_CN");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      void params.then(({ id, chapterId: resolvedChapterId }) => {
        setProjectId(id);
        setChapterId(resolvedChapterId);
      });
    });
  }, [params]);

  useEffect(() => {
    if (!chapterId) return;
    startTransition(() => {
      void loadChapter(chapterId);
    });
  }, [chapterId]);

  async function loadChapter(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chapters/${id}`, { cache: "no-store" });
      const data = (await response.json()) as {
        message?: string;
        chapter?: ChapterPayload;
      };

      if (!response.ok || !data.chapter) {
        throw new Error(data.message ?? "读取章节失败。");
      }

      setChapter(data.chapter);
      setOutputLanguage(data.chapter.project.defaultOutputLanguage);

      const latestDraft = data.chapter.drafts.find(
        (draft) => draft.language === data.chapter?.project.defaultOutputLanguage,
      );

      if (latestDraft) {
        setContent(latestDraft.content);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取章节失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDraft() {
    if (!chapterId) {
      setError("章节 ID 缺失。");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/ai/chapters/${chapterId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputLanguage }),
      });

      const data = (await response.json()) as {
        message?: string;
        draft?: DraftItem;
        model?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.message ?? "AI 生成正文失败。");
      }

      setContent(data.draft.content);
      setSuccess(`AI 已生成正文，当前模型：${data.model ?? "未返回"}`);
      await loadChapter(chapterId);
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : "AI 生成正文失败。",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!chapterId) {
      setError("章节 ID 缺失。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/chapters/${chapterId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          language: outputLanguage,
          generationMode: "manual_edit",
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "保存正文失败。");
      }

      setSuccess("正文草稿已保存。");
      await loadChapter(chapterId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存正文失败。");
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
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Chapter Draft</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {chapter ? `第 ${chapter.chapterNo} 章 · ${chapter.title}` : "章节写作页"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                这里会基于中文母稿生成正文。你可以按项目默认输出中文或马来文，也可以临时切换。
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={projectId ? `/projects/${projectId}/chapters` : "/projects"}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回目录页
              </Link>
            </div>
          </div>

          {chapter ? (
            <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">默认输出</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {getOutputLanguageLabel(chapter.project.defaultOutputLanguage)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">术语策略</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {getTerminologyModeLabel(chapter.project.terminologyMode)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">本章摘要</p>
                <p className="mt-2 text-sm text-zinc-700">{chapter.summary}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">结尾钩子</p>
                <p className="mt-2 text-sm text-zinc-700">{chapter.endingHook ?? "未设置"}</p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
              正在读取章节...
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                <h2 className="text-2xl font-semibold">生成设置</h2>
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">输出语言</span>
                    <select
                      value={outputLanguage}
                      onChange={(event) =>
                        setOutputLanguage(event.target.value as OutputLanguageValue)
                      }
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                    >
                      {outputLanguageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={generating}
                    className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generating ? "AI 生成中..." : "AI 生成正文"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "保存中..." : "保存草稿"}
                  </button>
                </div>

                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
                {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

                <div className="mt-8">
                  <h3 className="text-lg font-semibold">最近草稿</h3>
                  <div className="mt-4 space-y-3">
                    {chapter?.drafts.length ? (
                      chapter.drafts.map((draft) => (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() => {
                            setContent(draft.content);
                            setOutputLanguage(draft.language);
                          }}
                          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm transition hover:border-zinc-900"
                        >
                          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                            <span>Draft #{draft.draftNo}</span>
                            <span>{getOutputLanguageLabel(draft.language)}</span>
                            <span>{draft.generationMode ?? "unknown"}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">还没有草稿。</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                <h2 className="text-2xl font-semibold">正文编辑器</h2>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="mt-5 min-h-[32rem] w-full rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-4 text-sm leading-8 outline-none transition focus:border-amber-400"
                  placeholder="这里会显示 AI 生成的正文，或者你可以自己直接修改。"
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
