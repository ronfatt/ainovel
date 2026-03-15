export const outputLanguageOptions = [
  { value: "ZH_CN", label: "中文", description: "正文默认输出简体中文。" },
  { value: "MS_MY", label: "马来文", description: "正文默认输出自然的马来文。" },
] as const;

export const terminologyModeOptions = [
  {
    value: "KEEP_CN_TERMS",
    label: "保留中文风格",
    description: "保留宗门、境界、招式等中文风格专有名词。",
  },
  {
    value: "HYBRID_TERMS",
    label: "混合表达",
    description: "保留核心中文术语，但在目标语言里做解释性表达。",
  },
  {
    value: "LOCALIZED_TERMS",
    label: "本地化表达",
    description: "正文里尽量用目标语言更自然的表达方式改写术语。",
  },
] as const;

export type OutputLanguageValue = (typeof outputLanguageOptions)[number]["value"];
export type TerminologyModeValue = (typeof terminologyModeOptions)[number]["value"];

export function getOutputLanguageLabel(value: string) {
  return outputLanguageOptions.find((option) => option.value === value)?.label ?? value;
}

export function getTerminologyModeLabel(value: string) {
  return terminologyModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function getOutputLanguagePrompt(value: string) {
  return value === "MS_MY" ? "马来文（ms-MY）" : "简体中文（zh-CN）";
}

export function getTerminologyPrompt(value: string) {
  if (value === "LOCALIZED_TERMS") {
    return "专有名词尽量用目标语言更自然的表达方式改写，避免生硬直译。";
  }

  if (value === "HYBRID_TERMS") {
    return "保留核心中文术语，但在正文中用目标语言做适度解释，让读者更容易理解。";
  }

  return "保留中文风格专有名词，例如宗门、境界、招式、系统提示等，不要过度本地化。";
}
