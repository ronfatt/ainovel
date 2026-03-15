"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import {
  getOutputLanguageLabel,
  getTerminologyModeLabel,
  type OutputLanguageValue,
  type TerminologyModeValue,
} from "@/lib/project-language";

type StoryBibleResponse = {
  id?: string;
  projectId?: string;
  logline?: string;
  synopsis?: string;
  coreConflict?: string;
  protagonistProfile?: { content?: string } | null;
  supportingCast?: { content?: string } | null;
  antagonistProfile?: { content?: string } | null;
  worldSetting?: { content?: string } | null;
  powerSystem?: { content?: string } | null;
  mainPlot?: { content?: string } | null;
  earlyStageHighlights?: { content?: string } | null;
  styleRules?: { content?: string } | null;
  lockedFields?: { content?: string } | null;
  version?: number;
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
};

type StoryBibleForm = {
  logline: string;
  synopsis: string;
  coreConflict: string;
  protagonistProfile: string;
  supportingCast: string;
  antagonistProfile: string;
  worldSetting: string;
  powerSystem: string;
  mainPlot: string;
  earlyStageHighlights: string;
  styleRules: string;
  lockedFields: string;
};

const emptyForm: StoryBibleForm = {
  logline: "",
  synopsis: "",
  coreConflict: "",
  protagonistProfile: "",
  supportingCast: "",
  antagonistProfile: "",
  worldSetting: "",
  powerSystem: "",
  mainPlot: "",
  earlyStageHighlights: "",
  styleRules: "",
  lockedFields: "",
};

function getBlockText(value?: { content?: string } | null) {
  return value?.content ?? "";
}

export default function StoryBiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [form, setForm] = useState<StoryBibleForm>(emptyForm);
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
      void loadStoryBible(projectId);
    });
  }, [projectId]);

  async function loadStoryBible(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/story-bible`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        project?: ProjectPayload;
        storyBible?: StoryBibleResponse | null;
      };

      if (!response.ok || !data.project) {
        throw new Error(data.message ?? "读取故事设定失败。");
      }

      const projectData = data.project;

      setProject(projectData);

      if (data.storyBible) {
        setVersion(data.storyBible.version ?? null);
        setForm({
          logline: data.storyBible.logline ?? "",
          synopsis: data.storyBible.synopsis ?? "",
          coreConflict: data.storyBible.coreConflict ?? "",
          protagonistProfile: getBlockText(data.storyBible.protagonistProfile),
          supportingCast: getBlockText(data.storyBible.supportingCast),
          antagonistProfile: getBlockText(data.storyBible.antagonistProfile),
          worldSetting: getBlockText(data.storyBible.worldSetting),
          powerSystem: getBlockText(data.storyBible.powerSystem),
          mainPlot: getBlockText(data.storyBible.mainPlot),
          earlyStageHighlights: getBlockText(data.storyBible.earlyStageHighlights),
          styleRules: getBlockText(data.storyBible.styleRules),
          lockedFields: getBlockText(data.storyBible.lockedFields),
        });
      } else {
        setVersion(null);
        setForm(() => ({
          ...emptyForm,
          synopsis: projectData.premise,
          styleRules: projectData.tone ?? "",
        }));
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "读取故事设定失败，请稍后再试。",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof StoryBibleForm>(key: K, value: StoryBibleForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
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
      const response = await fetch(`/api/projects/${projectId}/story-bible`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        message?: string;
        storyBible?: StoryBibleResponse;
      };

      if (!response.ok || !data.storyBible) {
        throw new Error(data.message ?? "保存故事设定失败。");
      }

      setVersion(data.storyBible.version ?? null);
      setSuccess("故事设定已保存，后面就可以接大纲和章节目录。");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "保存故事设定失败，请稍后再试。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateDraft() {
    if (!projectId) {
      setError("项目 ID 缺失。");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/ai/story-bible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const data = (await response.json()) as {
        message?: string;
        draft?: StoryBibleForm;
        storyBible?: StoryBibleResponse;
        model?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.message ?? "AI 生成失败。");
      }

      setForm({
        logline: data.draft.logline ?? "",
        synopsis: data.draft.synopsis ?? "",
        coreConflict: data.draft.coreConflict ?? "",
        protagonistProfile: data.draft.protagonistProfile ?? "",
        supportingCast: data.draft.supportingCast ?? "",
        antagonistProfile: data.draft.antagonistProfile ?? "",
        worldSetting: data.draft.worldSetting ?? "",
        powerSystem: data.draft.powerSystem ?? "",
        mainPlot: data.draft.mainPlot ?? "",
        earlyStageHighlights: data.draft.earlyStageHighlights ?? "",
        styleRules: data.draft.styleRules ?? "",
        lockedFields: data.draft.lockedFields ?? "",
      });
      setVersion(data.storyBible?.version ?? version);
      setSuccess(`AI 已生成一版故事设定初稿，当前模型：${data.model ?? "未返回"}`);
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

  const fields: Array<{
    key: keyof StoryBibleForm;
    label: string;
    placeholder: string;
    rows?: number;
  }> = [
    {
      key: "logline",
      label: "一句话卖点",
      placeholder: "一句话说清主角、设定和最大爽点。",
      rows: 3,
    },
    {
      key: "synopsis",
      label: "故事简介",
      placeholder: "概括开局、主线、目标和整体阅读预期。",
      rows: 5,
    },
    {
      key: "coreConflict",
      label: "核心冲突",
      placeholder: "这本书最重要的对抗是什么，主角要赢谁、破谁的局。",
      rows: 4,
    },
    {
      key: "protagonistProfile",
      label: "主角设定",
      placeholder: "身份、性格、优势、缺陷、底层欲望。",
      rows: 5,
    },
    {
      key: "supportingCast",
      label: "配角群像",
      placeholder: "队友、家人、对手、贵人，各自的作用和关系。",
      rows: 5,
    },
    {
      key: "antagonistProfile",
      label: "反派设定",
      placeholder: "前期反派、中期压制者、最终对手。",
      rows: 4,
    },
    {
      key: "worldSetting",
      label: "世界观",
      placeholder: "时代背景、世界规则、资源分配和大环境。",
      rows: 5,
    },
    {
      key: "powerSystem",
      label: "力量体系 / 系统规则",
      placeholder: "境界、技能、系统功能、升级限制。",
      rows: 5,
    },
    {
      key: "mainPlot",
      label: "主线目标",
      placeholder: "主角长期目标是什么，推进路径是什么。",
      rows: 4,
    },
    {
      key: "earlyStageHighlights",
      label: "前期爽点",
      placeholder: "开篇 20 到 50 章的打脸、逆袭、升级、钩子设计。",
      rows: 4,
    },
    {
      key: "styleRules",
      label: "文风要求",
      placeholder: "例如：快节奏、口语化、章节尾强钩子。",
      rows: 3,
    },
    {
      key: "lockedFields",
      label: "锁定设定",
      placeholder: "绝对不能改动的设定、人物关系、系统硬规则。",
      rows: 4,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fefce8_0%,_#fff7ed_28%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Story Bible</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {project?.title ?? "故事设定页"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                这里是后面生成大纲、章节目录和正文的底稿。先把设定写稳，后面整本书才不容易跑偏。
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/projects"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回作品库
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
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">核心脑洞</p>
                <p className="mt-2 text-sm text-zinc-700">{project.premise}</p>
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
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">风格</p>
                <p className="mt-2 text-sm text-zinc-700">{project.tone ?? "未设置"}</p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
              正在读取故事设定...
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
                  onClick={handleGenerateDraft}
                  disabled={generating || loading}
                  className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? "AI 生成中..." : "AI 生成初稿"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存故事设定"}
                </button>
                <Link
                  href={projectId ? `/projects/${projectId}/outline` : "/projects"}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                >
                  进入大纲页
                </Link>
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                >
                  清空表单
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
