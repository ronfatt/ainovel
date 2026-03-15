"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { characterRoleOptions, getCharacterRoleLabel } from "@/lib/character-visual";

type CharacterItem = {
  id: string;
  name: string;
  role: string;
  profile: {
    summary?: string;
  } | null;
  notes: string | null;
  appearancePromptZh: string | null;
  appearancePromptEn: string | null;
  negativePrompt: string | null;
  referenceImageData: string | null;
  identityLockNotes: string | null;
  isVisualAnchor: boolean;
};

type ProjectPayload = {
  id: string;
  title: string;
};

type CharacterForm = {
  name: string;
  role: string;
  profileSummary: string;
  appearancePromptZh: string;
  appearancePromptEn: string;
  negativePrompt: string;
  identityLockNotes: string;
  notes: string;
  isVisualAnchor: boolean;
};

function toForm(character: CharacterItem): CharacterForm {
  return {
    name: character.name,
    role: character.role,
    profileSummary: character.profile?.summary ?? "",
    appearancePromptZh: character.appearancePromptZh ?? "",
    appearancePromptEn: character.appearancePromptEn ?? "",
    negativePrompt: character.negativePrompt ?? "",
    identityLockNotes: character.identityLockNotes ?? "",
    notes: character.notes ?? "",
    isVisualAnchor: character.isVisualAnchor,
  };
}

export default function CharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterForm>({
    name: "",
    role: "PROTAGONIST",
    profileSummary: "",
    appearancePromptZh: "",
    appearancePromptEn: "",
    negativePrompt: "",
    identityLockNotes: "",
    notes: "",
    isVisualAnchor: false,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
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
      void loadCharacters(projectId);
    });
    // We intentionally reload only when the route param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadCharacters(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/characters`, { cache: "no-store" });
      const data = (await response.json()) as {
        message?: string;
        project?: ProjectPayload;
        characters?: CharacterItem[];
      };

      if (!response.ok || !data.project) {
        throw new Error(data.message ?? "读取角色形象库失败。");
      }

      const nextCharacters = data.characters ?? [];
      setProject(data.project);
      setCharacters(nextCharacters);

      const current =
        nextCharacters.find((item) => item.id === selectedCharacterId) ??
        nextCharacters[0] ??
        null;

      setSelectedCharacterId(current?.id ?? null);
      if (current) {
        setForm(toForm(current));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取角色形象库失败。");
    } finally {
      setLoading(false);
    }
  }

  function selectCharacter(character: CharacterItem) {
    setSelectedCharacterId(character.id);
    setForm(toForm(character));
    setError(null);
    setSuccess(null);
  }

  function updateField<K extends keyof CharacterForm>(key: K, value: CharacterForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateCharacter() {
    if (!projectId) return;

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: characters.length === 0 ? "主角" : `角色 ${characters.length + 1}`,
          role: characters.length === 0 ? "PROTAGONIST" : "SUPPORTING",
        }),
      });
      const data = (await response.json()) as { message?: string; character?: CharacterItem };

      if (!response.ok || !data.character) {
        throw new Error(data.message ?? "创建角色失败。");
      }

      await loadCharacters(projectId);
      setSelectedCharacterId(data.character.id);
      setForm(toForm(data.character));
      setSuccess("新角色已创建。");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建角色失败。");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveCharacter() {
    if (!selectedCharacterId) {
      setError("请先选择一个角色。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/characters/${selectedCharacterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "保存角色失败。");
      }

      setSuccess("角色形象已保存。");
      await loadCharacters(projectId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存角色失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReference() {
    if (!selectedCharacterId) {
      setError("请先选择一个角色。");
      return;
    }

    setGeneratingImage(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/ai/characters/${selectedCharacterId}/reference-image`,
        {
          method: "POST",
        },
      );
      const data = (await response.json()) as { message?: string; model?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "生成参考图失败。");
      }

      setSuccess(`角色参考图已生成，当前模型：${data.model ?? "未返回"}`);
      await loadCharacters(projectId);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "生成参考图失败。",
      );
    } finally {
      setGeneratingImage(false);
    }
  }

  const selectedCharacter =
    characters.find((item) => item.id === selectedCharacterId) ?? null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf5_24%,_#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_-44px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Character Visuals</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {project ? `${project.title} · 角色形象库` : "角色形象库"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                先锁定主角的标准样貌，再去单章页手动生成每一章的封面，这样主角脸和气质会稳定很多。
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={projectId ? `/projects/${projectId}/chapters` : "/projects"}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              >
                返回章节目录
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-zinc-300 px-5 py-8 text-sm text-zinc-500">
              正在读取角色形象库...
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
              <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">角色列表</h2>
                  <button
                    type="button"
                    onClick={handleCreateCharacter}
                    disabled={creating}
                    className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "创建中..." : "新建角色"}
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {characters.length ? (
                    characters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => selectCharacter(character)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          selectedCharacterId === character.id
                            ? "border-amber-400 bg-amber-50"
                            : "border-zinc-200 hover:border-zinc-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{character.name}</p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {getCharacterRoleLabel(character.role)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {character.isVisualAnchor ? (
                              <span className="rounded-full bg-zinc-950 px-3 py-1 text-white">
                                视觉锚点
                              </span>
                            ) : null}
                            {character.referenceImageData ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                已有参考图
                              </span>
                            ) : (
                              <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">
                                未生成参考图
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">还没有角色。先创建一个主角形象。</p>
                  )}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                <h2 className="text-2xl font-semibold">角色锁定与参考图</h2>
                {selectedCharacter ? (
                  <>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-700">角色名</span>
                        <input
                          value={form.name}
                          onChange={(event) => updateField("name", event.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-700">角色定位</span>
                        <select
                          value={form.role}
                          onChange={(event) => updateField("role", event.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                        >
                          {characterRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-zinc-700">角色概述</span>
                      <textarea
                        rows={3}
                        value={form.profileSummary}
                        onChange={(event) => updateField("profileSummary", event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                        placeholder="例如：十八岁高武少年，黑发冷眼，身形修长，平时隐忍，爆发时极有压迫感。"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-zinc-700">中文外观锁定描述</span>
                      <textarea
                        rows={4}
                        value={form.appearancePromptZh}
                        onChange={(event) => updateField("appearancePromptZh", event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                        placeholder="把发型、脸型、眼神、服装、年龄感、体型、标志特征写清楚。"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-zinc-700">英文图片 Prompt</span>
                      <textarea
                        rows={4}
                        value={form.appearancePromptEn}
                        onChange={(event) => updateField("appearancePromptEn", event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                        placeholder="例如：young Chinese male, short black hair, sharp eyes, lean athletic build, dark training uniform..."
                      />
                    </label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-700">负面 Prompt</span>
                        <textarea
                          rows={4}
                          value={form.negativePrompt}
                          onChange={(event) => updateField("negativePrompt", event.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                          placeholder="例如：old face, beard, extra fingers, blurry eyes, different hairstyle"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-700">身份锁定备注</span>
                        <textarea
                          rows={4}
                          value={form.identityLockNotes}
                          onChange={(event) => updateField("identityLockNotes", event.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                          placeholder="例如：脸不能太成熟，发型保持短碎黑发，眼神冷静但有压迫感。"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-zinc-700">补充备注</span>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(event) => updateField("notes", event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none transition focus:border-amber-400"
                      />
                    </label>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={form.isVisualAnchor}
                        onChange={(event) => updateField("isVisualAnchor", event.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-950"
                      />
                      设为默认视觉锚点（单章页生成封面时默认使用这个角色）
                    </label>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleSaveCharacter}
                        disabled={saving}
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "保存中..." : "保存角色设定"}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateReference}
                        disabled={generatingImage}
                        className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {generatingImage ? "生成中..." : "AI 生成参考图"}
                      </button>
                    </div>

                    {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
                    {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

                    <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-900">当前参考图</p>
                      {selectedCharacter.referenceImageData ? (
                        <Image
                          src={selectedCharacter.referenceImageData}
                          alt={`${selectedCharacter.name} 参考图`}
                          width={1024}
                          height={1536}
                          className="mt-4 w-full rounded-[1.25rem] border border-zinc-200 bg-white object-cover"
                        />
                      ) : (
                        <p className="mt-3 text-sm text-zinc-500">
                          还没有参考图。先保存角色设定，再点“AI 生成参考图”。
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-sm text-zinc-500">
                    左侧先创建一个角色，再开始锁定主角样貌。
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
