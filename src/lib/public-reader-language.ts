import { OutputLanguage } from "@/generated/prisma/client";

export function formatPublicPublishedAt(value: Date | null, language: OutputLanguage) {
  if (!value) {
    return language === OutputLanguage.MS_MY ? "Baru dikemas kini" : "刚刚更新";
  }

  return new Intl.DateTimeFormat(language === OutputLanguage.MS_MY ? "ms-MY" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function getPublicReaderCopy(language: OutputLanguage) {
  if (language === OutputLanguage.MS_MY) {
    return {
      siteEyebrow: "Novel Awam",
      siteTitle: "Rak Novel Awam",
      siteDescription:
        "Di sini dipaparkan novel dan bab yang sudah diterbitkan. Studio penulisan terus digunakan untuk jana, sunting, dan terbitkan kandungan.",
      noCover: "Belum ada kulit awam",
      statusSerializing: "Sedang bersiri",
      latestUpdatePrefix: "Kemas kini terbaru",
      latestChapterPrefix: "Bab terbaru",
      noPublicIntro: "Novel ini belum mempunyai sinopsis awam.",
      noPublicChapter: "Belum ada bab awam",
      noPublicNovel: "Belum ada novel awam. Terbitkan bab pertama dari belakang tabir dahulu.",
      recentUpdates: "Kemas Kini Terkini",
      noRecentUpdates: "Belum ada kemas kini terkini.",
      chapterDirectory: "Senarai Bab",
      backToLibrary: "Kembali ke rak",
      backToDirectory: "Kembali ke senarai bab",
      previousChapter: "Bab Sebelumnya",
      nextChapter: "Bab Seterusnya",
      alreadyFirst: "Ini bab pertama",
      alreadyLatest: "Ini bab terkini",
      totalViews: "Jumlah bacaan",
      reads: "bacaan",
      chapterLabel: "Bab",
      readCount: "Jumlah bacaan",
    };
  }

  return {
    siteEyebrow: "Public Novel",
    siteTitle: "公开小说站",
    siteDescription:
      "这里展示你已经发布出去的小说和章节。写作后台继续负责生成、改稿和发布。",
    noCover: "暂无公开封面",
    statusSerializing: "连载中",
    latestUpdatePrefix: "最新更新",
    latestChapterPrefix: "最新章节",
    noPublicIntro: "这本书还没有公开简介。",
    noPublicChapter: "还没有公开章节",
    noPublicNovel: "还没有公开小说。先回后台发布第一章。",
    recentUpdates: "最近更新",
    noRecentUpdates: "还没有最近更新。",
    chapterDirectory: "章节目录",
    backToLibrary: "返回书库",
    backToDirectory: "返回章节目录",
    previousChapter: "上一章",
    nextChapter: "下一章",
    alreadyFirst: "已经是第一章",
    alreadyLatest: "已经是最新章",
    totalViews: "总阅读量",
    reads: "阅读",
    chapterLabel: "第",
    readCount: "阅读量",
  };
}

export function formatPublicChapterLabel(chapterNo: number, language: OutputLanguage) {
  return language === OutputLanguage.MS_MY ? `Bab ${chapterNo}` : `第 ${chapterNo} 章`;
}

