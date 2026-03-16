"use client";

import Image from "next/image";
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

type BriefItem = {
  id: string;
  version: number;
  notes: string | null;
  briefData: {
    opening?: string;
    conflict?: string;
    payoff?: string;
    twist?: string;
    endingHook?: string;
  };
};

type CharacterVisualItem = {
  id: string;
  name: string;
  role: string;
  isVisualAnchor: boolean;
  referenceImageData: string | null;
};

type ChapterCoverItem = {
  id: string;
  characterId: string | null;
  scenePrompt: string;
  shotPrompt: string | null;
  moodPrompt: string | null;
  imageData: string;
  modelName: string | null;
  isPrimary: boolean;
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
    characters: CharacterVisualItem[];
  };
  drafts: DraftItem[];
  briefs: BriefItem[];
  covers: ChapterCoverItem[];
};

type PreviousChapterPayload = {
  id: string;
  chapterNo: number;
  title: string;
  summary: string;
  corePayoff: string | null;
  endingHook: string | null;
  briefs: Array<{
    briefData: {
      endingHook?: string;
    };
  }>;
  drafts: Array<{
    content: string;
  }>;
};

type BriefForm = {
  opening: string;
  conflict: string;
  payoff: string;
  twist: string;
  endingHook: string;
  notes: string;
};

export default function ChapterWriterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [chapter, setChapter] = useState<ChapterPayload | null>(null);
  const [previousChapter, setPreviousChapter] = useState<PreviousChapterPayload | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguageValue>("ZH_CN");
  const [briefForm, setBriefForm] = useState<BriefForm>({
    opening: "",
    conflict: "",
    payoff: "",
    twist: "",
    endingHook: "",
    notes: "",
  });
  const [content, setContent] = useState("");
  const [coverCharacterId, setCoverCharacterId] = useState("");
  const [coverScenePrompt, setCoverScenePrompt] = useState("");
  const [coverShotPrompt, setCoverShotPrompt] = useState("竖版封面，电影感半身或近景，角色主体清晰");
  const [coverMoodPrompt, setCoverMoodPrompt] = useState("");
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [generatingNextChapter, setGeneratingNextChapter] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [settingPrimaryCover, setSettingPrimaryCover] = useState(false);
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
        previousChapter?: PreviousChapterPayload | null;
      };

      if (!response.ok || !data.chapter) {
        throw new Error(data.message ?? "读取章节失败。");
      }

      setChapter(data.chapter);
      setPreviousChapter(data.previousChapter ?? null);
      setOutputLanguage(data.chapter.project.defaultOutputLanguage);
      setCoverCharacterId(
        data.chapter.project.characters.find((character) => character.isVisualAnchor)?.id ??
          data.chapter.project.characters[0]?.id ??
          "",
      );
      setCoverScenePrompt(data.chapter.summary ?? "");
      setCoverMoodPrompt(data.chapter.corePayoff ?? data.chapter.endingHook ?? "");
      setSelectedCoverId(data.chapter.covers[0]?.id ?? null);

      const currentBrief = data.chapter.briefs[0];
      if (currentBrief) {
        setSelectedBriefId(currentBrief.id);
        setBriefForm({
          opening: currentBrief.briefData?.opening ?? "",
          conflict: currentBrief.briefData?.conflict ?? "",
          payoff: currentBrief.briefData?.payoff ?? "",
          twist: currentBrief.briefData?.twist ?? "",
          endingHook: currentBrief.briefData?.endingHook ?? "",
          notes: currentBrief.notes ?? "",
        });
      }

      const latestDraft = data.chapter.drafts.find(
        (draft) => draft.language === data.chapter?.project.defaultOutputLanguage,
      );

      if (latestDraft) {
        setSelectedDraftId(latestDraft.id);
        setContent(latestDraft.content);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取章节失败。");
    } finally {
      setLoading(false);
    }
  }

  function updateBriefField<K extends keyof BriefForm>(key: K, value: BriefForm[K]) {
    setBriefForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function loadBriefVersion(brief: BriefItem) {
    setSelectedBriefId(brief.id);
    setBriefForm({
      opening: brief.briefData?.opening ?? "",
      conflict: brief.briefData?.conflict ?? "",
      payoff: brief.briefData?.payoff ?? "",
      twist: brief.briefData?.twist ?? "",
      endingHook: brief.briefData?.endingHook ?? "",
      notes: brief.notes ?? "",
    });
    setSuccess(`已载入细纲版本 v${brief.version} 到编辑区。`);
  }

  function loadDraftVersion(draft: DraftItem) {
    setSelectedDraftId(draft.id);
    setOutputLanguage(draft.language);
    setContent(draft.content);
    setSuccess(`已载入正文草稿 Draft #${draft.draftNo} 到编辑区。`);
  }

  async function handleGenerateCover() {
    if (!chapterId) {
      setError("章节 ID 缺失。");
      return;
    }

    setGeneratingCover(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/ai/chapters/${chapterId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: coverCharacterId || undefined,
          scenePrompt: coverScenePrompt,
          shotPrompt: coverShotPrompt,
          moodPrompt: coverMoodPrompt,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        cover?: ChapterCoverItem;
        model?: string;
      };

      if (!response.ok || !data.cover) {
        throw new Error(data.message ?? "AI 生成章节封面失败。");
      }

      setSuccess(`章节封面已生成，当前模型：${data.model ?? "未返回"}`);
      await loadChapter(chapterId);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "AI 生成章节封面失败。",
      );
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleSetPrimaryCover() {
    if (!chapterId || !selectedCover) {
      setError("请先选中一张封面。");
      return;
    }

    setSettingPrimaryCover(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/chapters/${chapterId}/covers/${selectedCover.id}/select`,
        {
          method: "POST",
        },
      );
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "设置正式封面失败。");
      }

      setSuccess(data.message ?? "已设为本章正式封面。");
      await loadChapter(chapterId);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "设置正式封面失败。",
      );
    } finally {
      setSettingPrimaryCover(false);
    }
  }

  async function handleGenerateBrief() {
    if (!chapterId) {
      setError("章节 ID 缺失。");
      return;
    }

    setGeneratingBrief(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/ai/chapters/${chapterId}/brief`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        message?: string;
        draft?: BriefForm;
        model?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.message ?? "AI 生成细纲失败。");
      }

      setBriefForm({
        opening: data.draft.opening ?? "",
        conflict: data.draft.conflict ?? "",
        payoff: data.draft.payoff ?? "",
        twist: data.draft.twist ?? "",
        endingHook: data.draft.endingHook ?? "",
        notes: data.draft.notes ?? "",
      });
      setSuccess(`AI 已生成章节细纲，当前模型：${data.model ?? "未返回"}`);
      await loadChapter(chapterId);
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : "AI 生成细纲失败。",
      );
    } finally {
      setGeneratingBrief(false);
    }
  }

  async function handleSaveBrief() {
    if (!chapterId) {
      setError("章节 ID 缺失。");
      return;
    }

    setSavingBrief(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/chapters/${chapterId}/briefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(briefForm),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "保存细纲失败。");
      }

      setSuccess("章节细纲已保存。");
      await loadChapter(chapterId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存细纲失败。");
    } finally {
      setSavingBrief(false);
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

  async function handleGenerateNextChapter() {
    if (!chapterId || !projectId) {
      setError("章节 ID 缺失。");
      return;
    }

    setGeneratingNextChapter(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/ai/chapters/${chapterId}/next`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        message?: string;
        nextChapter?: { id: string; chapterNo: number; title: string };
        model?: string;
      };

      if (!response.ok || !data.nextChapter) {
        throw new Error(data.message ?? "AI 生成下一章失败。");
      }

      setSuccess(
        `AI 已生成第 ${data.nextChapter.chapterNo} 章《${data.nextChapter.title}》，当前模型：${data.model ?? "未返回"}`,
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : "AI 生成下一章失败。",
      );
    } finally {
      setGeneratingNextChapter(false);
    }
  }

  const selectedBrief =
    chapter?.briefs.find((brief) => brief.id === selectedBriefId) ?? chapter?.briefs[0] ?? null;
  const selectedDraft =
    chapter?.drafts.find((draft) => draft.id === selectedDraftId) ?? chapter?.drafts[0] ?? null;
  const selectedCover =
    chapter?.covers.find((cover) => cover.id === selectedCoverId) ?? chapter?.covers[0] ?? null;
  const targetWordCount = chapter?.wordCountTarget ?? 1800;
  const currentContentCount = content.trim().length;
  const selectedDraftCount = selectedDraft?.wordCount ?? 0;
  const hasBriefContent = [
    briefForm.opening,
    briefForm.conflict,
    briefForm.payoff,
    briefForm.twist,
    briefForm.endingHook,
  ].some((value) => value.trim().length > 0);
  const savedDraftContent = selectedDraft?.content.trim() ?? "";
  const hasPrimaryCover = chapter?.covers.some((cover) => cover.isPrimary) ?? false;
  const hasUnsavedDraftChanges =
    currentContentCount > 0 && content.trim() !== savedDraftContent;

  const nextStep = (() => {
    if (!hasBriefContent) {
      return {
        title: "先生成细纲",
        description: "先把这一章拆成开场、冲突、爽点、转折和结尾钩子，再去写正文会更稳。",
      };
    }

    if (!selectedBrief) {
      return {
        title: "先保存细纲",
        description: "左边细纲已经有内容了，先保存下来，再生成正文会更不容易跑偏。",
      };
    }

    if (currentContentCount === 0) {
      return {
        title: "接着生成正文",
        description: "细纲已经准备好了，现在最适合点 AI 生成正文，把这一章先写出来。",
      };
    }

    if (hasUnsavedDraftChanges) {
      return {
        title: "先保存草稿",
        description: "当前正文和最近草稿不一致，先保存这一版，后面续写和衔接会更稳。",
      };
    }

    if (!hasPrimaryCover) {
      return {
        title: "最后生成封面",
        description: "正文已经成型了，现在可以按本章情绪和场景去生成正式封面。",
      };
    }

    return {
      title: "可以推进下一章",
      description: "这一章的细纲、正文和正式封面都齐了，接下来适合去生成下一章目录。",
    };
  })();

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
                href={projectId ? `/projects/${projectId}/characters` : "/projects"}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                角色形象库
              </Link>
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

          {!loading && chapter ? (
            <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-950 px-5 py-4 text-white shadow-[0_16px_40px_-28px_rgba(24,24,27,0.65)]">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Next Step</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{nextStep.title}</p>
                  <p className="mt-1 text-sm leading-7 text-zinc-300">{nextStep.description}</p>
                </div>
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
                <h2 className="text-2xl font-semibold">章节细纲与生成设置</h2>
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">开场</span>
                    <textarea
                      rows={3}
                      value={briefForm.opening}
                      onChange={(event) => updateBriefField("opening", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">冲突推进</span>
                    <textarea
                      rows={3}
                      value={briefForm.conflict}
                      onChange={(event) => updateBriefField("conflict", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">爽点爆发</span>
                    <textarea
                      rows={3}
                      value={briefForm.payoff}
                      onChange={(event) => updateBriefField("payoff", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">转折</span>
                    <textarea
                      rows={3}
                      value={briefForm.twist}
                      onChange={(event) => updateBriefField("twist", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">结尾钩子</span>
                    <textarea
                      rows={3}
                      value={briefForm.endingHook}
                      onChange={(event) => updateBriefField("endingHook", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-700">补充说明</span>
                    <textarea
                      rows={3}
                      value={briefForm.notes}
                      onChange={(event) => updateBriefField("notes", event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                    />
                  </label>
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
                    onClick={handleGenerateBrief}
                    disabled={generatingBrief}
                    className="rounded-full bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingBrief ? "细纲生成中..." : "AI 生成细纲"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBrief}
                    disabled={savingBrief}
                    className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingBrief ? "细纲保存中..." : "保存细纲"}
                  </button>
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
                  <button
                    type="button"
                    onClick={handleGenerateNextChapter}
                    disabled={generatingNextChapter}
                    className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingNextChapter ? "生成下一章中..." : "AI 生成下一章目录"}
                  </button>
                </div>

                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
                {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

                {previousChapter ? (
                  <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="text-lg font-semibold">上一章承接信息</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-zinc-700">
                        <p>
                          <strong>上一章：</strong>
                          第 {previousChapter.chapterNo} 章《{previousChapter.title}》
                        </p>
                        <p className="mt-2">
                          <strong>摘要：</strong>
                          {previousChapter.summary}
                        </p>
                        <p className="mt-2">
                          <strong>爽点：</strong>
                          {previousChapter.corePayoff || "未记录"}
                        </p>
                        <p className="mt-2">
                          <strong>结尾钩子：</strong>
                          {previousChapter.endingHook || "未记录"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-zinc-700">
                        <p>
                          <strong>细纲结尾：</strong>
                          {previousChapter.briefs[0]?.briefData?.endingHook || "未记录"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap">
                          <strong>正文最后状态：</strong>
                          {previousChapter.drafts[0]?.content.slice(-220) || "上一章还没有正文草稿。"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">章节封面</h3>
                    <button
                      type="button"
                      onClick={handleGenerateCover}
                      disabled={generatingCover || !chapter?.project.characters.length}
                      className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingCover ? "封面生成中..." : "AI 生成本章封面"}
                    </button>
                  </div>
                  {chapter?.project.characters.length ? (
                    <>
                      <div className="mt-4 grid gap-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-zinc-700">锁定角色</span>
                          <select
                            value={coverCharacterId}
                            onChange={(event) => setCoverCharacterId(event.target.value)}
                            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                          >
                            {chapter.project.characters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                                {character.isVisualAnchor ? " · 默认视觉锚点" : ""}
                                {character.referenceImageData ? "" : " · 未锁参考图"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-zinc-700">场景描述</span>
                          <textarea
                            rows={3}
                            value={coverScenePrompt}
                            onChange={(event) => setCoverScenePrompt(event.target.value)}
                            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                          />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-700">镜头构图</span>
                            <input
                              value={coverShotPrompt}
                              onChange={(event) => setCoverShotPrompt(event.target.value)}
                              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-700">情绪气氛</span>
                            <input
                              value={coverMoodPrompt}
                              onChange={(event) => setCoverMoodPrompt(event.target.value)}
                              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {chapter.covers.length ? (
                          chapter.covers.map((cover) => (
                            <button
                              key={cover.id}
                              type="button"
                              onClick={() => setSelectedCoverId(cover.id)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                                selectedCoverId === cover.id
                                  ? "border-amber-400 bg-white"
                                  : "border-zinc-200 hover:border-zinc-900"
                              }`}
                            >
                              <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                                <span>封面版本</span>
                                <span>{cover.modelName ?? "未记录模型"}</span>
                                {cover.isPrimary ? (
                                  <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-white">
                                    正式封面
                                  </span>
                                ) : null}
                                <span>{new Date(cover.createdAt).toLocaleString()}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500">
                            还没有章节封面。先锁定主角参考图，再点“AI 生成本章封面”。
                          </p>
                        )}
                      </div>

                      {selectedCover ? (
                        <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-white p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-zinc-900">
                              {selectedCover.isPrimary ? "当前正式封面" : "候选封面预览"}
                            </p>
                            <button
                              type="button"
                              onClick={handleSetPrimaryCover}
                              disabled={selectedCover.isPrimary || settingPrimaryCover}
                              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {selectedCover.isPrimary
                                ? "已是正式封面"
                                : settingPrimaryCover
                                  ? "设置中..."
                                  : "设为正式封面"}
                            </button>
                          </div>
                          <Image
                            src={selectedCover.imageData}
                            alt={`${chapter?.title ?? "章节"} 封面`}
                            width={1024}
                            height={1536}
                            className="w-full rounded-[1.25rem] border border-zinc-200 object-cover"
                          />
                          <p className="mt-3 text-xs leading-6 text-zinc-500">
                            场景：{selectedCover.scenePrompt}
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      还没有角色视觉锚点。先去角色形象库创建主角，并生成参考图。
                    </p>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold">历史细纲</h3>
                  <div className="mt-4 space-y-3">
                    {chapter?.briefs.length ? (
                      chapter.briefs.map((brief) => (
                        <button
                          key={brief.id}
                          type="button"
                          onClick={() => setSelectedBriefId(brief.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selectedBriefId === brief.id
                              ? "border-amber-400 bg-amber-50"
                              : "border-zinc-200 hover:border-zinc-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                              <span>Brief v{brief.version}</span>
                              <span>{brief.notes ? "含补充说明" : "无补充说明"}</span>
                            </div>
                            <span className="text-xs text-zinc-500">
                              {selectedBriefId === brief.id ? "对比中" : "点击对比"}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">还没有细纲历史。</p>
                    )}
                  </div>

                  {selectedBrief ? (
                    <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-zinc-900">
                          细纲版本对比 · v{selectedBrief.version}
                        </h4>
                        <button
                          type="button"
                          onClick={() => loadBriefVersion(selectedBrief)}
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                        >
                          载入此细纲
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前编辑区</p>
                          <div className="mt-3 space-y-2 text-sm leading-7 text-zinc-700">
                            <p><strong>开场：</strong>{briefForm.opening || "未填写"}</p>
                            <p><strong>冲突：</strong>{briefForm.conflict || "未填写"}</p>
                            <p><strong>爽点：</strong>{briefForm.payoff || "未填写"}</p>
                            <p><strong>转折：</strong>{briefForm.twist || "未填写"}</p>
                            <p><strong>结尾：</strong>{briefForm.endingHook || "未填写"}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">历史版本</p>
                          <div className="mt-3 space-y-2 text-sm leading-7 text-zinc-700">
                            <p><strong>开场：</strong>{selectedBrief.briefData?.opening || "未填写"}</p>
                            <p><strong>冲突：</strong>{selectedBrief.briefData?.conflict || "未填写"}</p>
                            <p><strong>爽点：</strong>{selectedBrief.briefData?.payoff || "未填写"}</p>
                            <p><strong>转折：</strong>{selectedBrief.briefData?.twist || "未填写"}</p>
                            <p><strong>结尾：</strong>{selectedBrief.briefData?.endingHook || "未填写"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <h3 className="mt-8 text-lg font-semibold">最近草稿</h3>
                  <div className="mt-4 space-y-3">
                    {chapter?.drafts.length ? (
                      chapter.drafts.map((draft) => (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() => setSelectedDraftId(draft.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selectedDraftId === draft.id
                              ? "border-amber-400 bg-amber-50"
                              : "border-zinc-200 hover:border-zinc-900"
                          }`}
                        >
                          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                            <span>Draft #{draft.draftNo}</span>
                            <span>{getOutputLanguageLabel(draft.language)}</span>
                            <span>{draft.generationMode ?? "unknown"}</span>
                            <span>{draft.wordCount} 字</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">还没有草稿。</p>
                    )}
                  </div>

                  {selectedDraft ? (
                    <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-zinc-900">
                          正文版本对比 · Draft #{selectedDraft.draftNo}
                        </h4>
                        <button
                          type="button"
                          onClick={() => loadDraftVersion(selectedDraft)}
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                        >
                          载入此草稿
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前编辑区</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                            {content || "当前编辑区为空。"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            历史版本 · {getOutputLanguageLabel(selectedDraft.language)}
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                            {selectedDraft.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                <h2 className="text-2xl font-semibold">正文编辑器</h2>
                <div className="mt-5 grid gap-3 rounded-[1.25rem] border border-amber-100 bg-amber-50/60 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-700">目标字数</p>
                    <p className="mt-2 text-sm font-medium text-zinc-800">{targetWordCount} 字</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-700">当前编辑字数</p>
                    <p className="mt-2 text-sm font-medium text-zinc-800">{currentContentCount} 字</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-700">对比草稿字数</p>
                    <p className="mt-2 text-sm font-medium text-zinc-800">{selectedDraftCount} 字</p>
                  </div>
                </div>
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
