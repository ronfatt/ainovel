"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import {
  getOutputLanguageLabel,
  getTerminologyModeLabel,
  type OutputLanguageValue,
  type TerminologyModeValue,
} from "@/lib/project-language";

type OutlineStructure = {
  openingHook?: string;
  volumePlan?: string;
  midpointTwist?: string;
  finaleDirection?: string;
};

type OutlinePayload = {
  id?: string;
  title?: string | null;
  summary?: string | null;
  structureData?: OutlineStructure | null;
  version?: number;
};

type StoryBibleSummary = {
  id: string;
  logline: string;
  synopsis: string;
  coreConflict: string;
  version: number;
};

type ProjectPayload = {
  id: string;
  title: string;
  genre: string;
  premise: string;
  tone: string | null;
  sourceLanguage: OutputLanguageValue;
  defaultOutputLanguage: OutputLanguageValue;
  terminologyMode: TerminologyModeValue;
  storyBible: StoryBibleSummary | null;
};

type OutlineForm = {
  title: string;
  summary: string;
  openingHook: string;
  volumePlan: string;
  midpointTwist: string;
  finaleDirection: string;
};

const emptyForm: OutlineForm = {
  title: "",
  summary: "",
  openingHook: "",
  volumePlan: "",
  midpointTwist: "",
  finaleDirection: "",
};

export default function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [form, setForm] = useState<OutlineForm>(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      void params.then(({ id }) => {
        setProjectId(id);
      });
    });
  }, [params]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    startTransition(() => {
      void loadOutline(projectId);
    });
  }, [projectId]);

  async function loadOutline(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/outline`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        project?: ProjectPayload;
        outline?: OutlinePayload | null;
      };

      if (!response.ok || !data.project) {
        throw new Error(data.message ?? "读取大纲失败。");
      }

      const projectData = data.project;

      setProject(projectData);

      if (data.outline) {
        setVersion(data.outline.version ?? null);
        setForm({
          title: data.outline.title ?? "",
          summary: data.outline.summary ?? "",
          openingHook: data.outline.structureData?.openingHook ?? "",
          volumePlan: data.outline.structureData?.volumePlan ?? "",
          midpointTwist: data.outline.structureData?.midpointTwist ?? "",
          finaleDirection: data.outline.structureData?.finaleDirection ?? "",
        });
      } else {
        setVersion(null);
        setForm(() => ({
          ...emptyForm,
          title: projectData.title,
          summary: projectData.storyBible?.synopsis ?? "",
        }));
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "读取大纲失败，请稍后再试。",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof OutlineForm>(key: K, value: OutlineForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleGenerateOutline() {
    if (!projectId) {
      setError("项目 ID 缺失。");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/ai/outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const data = (await response.json()) as {
        message?: string;
        draft?: OutlineForm;
        outline?: OutlinePayload;
        model?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.message ?? "AI 生成失败。");
      }

      setForm({
        title: data.draft.title ?? "",
        summary: data.draft.summary ?? "",
        openingHook: data.draft.openingHook ?? "",
        volumePlan: data.draft.volumePlan ?? "",
        midpointTwist: data.draft.midpointTwist ?? "",
        finaleDirection: data.draft.finaleDirection ?? "",
      });
      setVersion(data.outline?.version ?? version);
      setSuccess(`AI 已生成一版全书大纲，当前模型：${data.model ?? "未返回"}`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "AI 生成失败，请稍后再试。",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectId) {
      setError("项目 ID 缺失。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/outline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        message?: string;
        outline?: OutlinePayload;
      };

      if (!response.ok || !data.outline) {
        throw new Error(data.message ?? "保存大纲失败。");
      }

      setVersion(data.outline.version ?? null);
      setSuccess("全书大纲已保存，后面就可以继续拆章节目录。");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "保存大纲失败，请稍后再试。",
      );
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{
    key: keyof OutlineForm;
    label: string;
    placeholder: string;
    rows?: number;
  }> = [
    {
      key: "title",
      label: "大纲标题",
      placeholder: "例如：五十万字都市逆袭爽文总纲",
      rows: 2,
    },
    {
      key: "summary",
      label: "全书摘要",
      placeholder: "概括这本书的整体路线、节奏和目标。",
      rows: 6,
    },
    {
      key: "openingHook",
      label: "开篇钩子",
      placeholder: "开局前 3 到 10 章要如何勾住读者。",
      rows: 4,
    },
    {
      key: "volumePlan",
      label: "分卷规划",
      placeholder: "按前期、中期、后期或按卷拆解升级、冲突和爽点。",
      rows: 8,
    },
    {
      key: "midpointTwist",
      label: "中期转折",
      placeholder: "中段最关键的反转、压力升级和主线变化。",
      rows: 5,
    },
    {
      key: "finaleDirection",
      label: "结局方向",
      placeholder: "最终高潮、终局对手、主题兑现和收束方式。",
      rows: 5,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Outline</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {project?.title ?? "全书大纲页"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                这里把故事设定进一步拆成完整长篇路线。先把开篇钩子、分卷升级和结局方向确定下来，后面目录会稳很多。
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/projects"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回作品库
              </Link>
              <Link
                href={projectId ? `/projects/${projectId}/story-bible` : "/projects"}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回故事设定
              </Link>
              {version ? (
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
                  版本 {version}
                </span>
              ) : null}
            </div>
          </div>

          {project ? (
            <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">题材</p>
                <p className="mt-2 text-sm text-zinc-700">{project.genre}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">策划语言</p>
                <p className="mt-2 text-sm text-zinc-700">中文母稿</p>
              </div>
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
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">一句话卖点</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {project.storyBible?.logline ?? "还没有故事设定"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">核心冲突</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {project.storyBible?.coreConflict ?? "还没有故事设定"}
                </p>
              </div>
            </div>
          ) : null}

          {!project?.storyBible && !loading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-amber-300 bg-amber-50 px-5 py-8 text-sm leading-7 text-amber-900">
              你还没有故事设定。先去故事设定页生成并保存一版故事设定，再回来生成大纲。
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
              正在读取大纲...
            </div>
          ) : (
            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-700">
                    {field.label}
                  </span>
                  <textarea
                    rows={field.rows ?? 4}
                    value={form[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                  />
                </label>
              ))}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateOutline}
                  disabled={generating || loading || !project?.storyBible}
                  className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? "AI 生成中..." : "AI 生成大纲"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存大纲"}
                </button>
                <Link
                  href={projectId ? `/projects/${projectId}/chapters` : "/projects"}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                >
                  进入章节目录
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
