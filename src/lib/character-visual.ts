export const characterRoleOptions = [
  { value: "PROTAGONIST", label: "主角" },
  { value: "SUPPORTING", label: "配角" },
  { value: "ANTAGONIST", label: "反派" },
  { value: "MENTOR", label: "师父/导师" },
  { value: "LOVE_INTEREST", label: "感情线角色" },
  { value: "OTHER", label: "其他" },
] as const;

export function getCharacterRoleLabel(role: string) {
  return characterRoleOptions.find((option) => option.value === role)?.label ?? role;
}

type CharacterPromptSource = {
  name: string;
  role: string;
  profileSummary?: string | null;
  appearancePromptZh?: string | null;
  appearancePromptEn?: string | null;
  identityLockNotes?: string | null;
  negativePrompt?: string | null;
};

type ChapterCoverPromptInput = CharacterPromptSource & {
  projectTitle: string;
  chapterTitle: string;
  chapterSummary: string;
  corePayoff?: string | null;
  endingHook?: string | null;
  scenePrompt?: string | null;
  shotPrompt?: string | null;
  moodPrompt?: string | null;
};

export function buildReferenceImagePrompt(character: CharacterPromptSource) {
  return [
    "Create a polished vertical web novel character reference portrait for future chapter covers.",
    `Character name: ${character.name}.`,
    `Story role: ${getCharacterRoleLabel(character.role)}.`,
    character.profileSummary ? `Core profile: ${character.profileSummary}.` : null,
    character.appearancePromptZh ? `Chinese appearance notes: ${character.appearancePromptZh}.` : null,
    character.appearancePromptEn ? `Appearance prompt: ${character.appearancePromptEn}.` : null,
    character.identityLockNotes
      ? `Identity lock notes: ${character.identityLockNotes}. Keep these fixed across future images.`
      : "Keep the same face, hairstyle, body build, age impression, and signature visual traits across future images.",
    "Single character only, centered composition, clean studio-like background, waist-up portrait, strong facial clarity, highly detailed web novel cover art.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildChapterCoverPrompt(input: ChapterCoverPromptInput) {
  return [
    "Create a vertical chapter cover illustration for a serialized web novel.",
    `Project: ${input.projectTitle}.`,
    `Chapter title: ${input.chapterTitle}.`,
    `Main character: ${input.name}.`,
    input.profileSummary ? `Core profile: ${input.profileSummary}.` : null,
    input.appearancePromptZh ? `Chinese appearance notes: ${input.appearancePromptZh}.` : null,
    input.appearancePromptEn ? `Appearance prompt: ${input.appearancePromptEn}.` : null,
    input.identityLockNotes
      ? `Identity lock notes: ${input.identityLockNotes}.`
      : "Keep the same face, hairstyle, body shape, and signature look as the reference image.",
    `Chapter scene: ${input.scenePrompt || input.chapterSummary}.`,
    input.corePayoff ? `Chapter payoff: ${input.corePayoff}.` : null,
    input.endingHook ? `Ending hook mood: ${input.endingHook}.` : null,
    `Desired shot: ${input.shotPrompt || "dramatic vertical cover composition, cinematic medium shot, readable silhouette"}.`,
    `Desired mood: ${input.moodPrompt || input.corePayoff || "tense, high-impact, cliffhanger energy"}.`,
    "Highly detailed, cinematic lighting, dynamic action readability, web novel cover art, no text, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}
