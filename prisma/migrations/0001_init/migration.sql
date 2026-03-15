-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'WRITING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutlineType" AS ENUM ('FULL_BOOK');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('PLANNED', 'BRIEFED', 'DRAFTED', 'REVISED', 'DONE');

-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('PROTAGONIST', 'SUPPORTING', 'ANTAGONIST', 'MENTOR', 'LOVE_INTEREST', 'OTHER');

-- CreateEnum
CREATE TYPE "WorldRuleCategory" AS ENUM ('WORLD', 'POWER_SYSTEM', 'FACTION', 'ITEM', 'SYSTEM', 'PLOT', 'OTHER');

-- CreateEnum
CREATE TYPE "ForeshadowStatus" AS ENUM ('PLANTED', 'PENDING', 'RESOLVED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "premise" TEXT NOT NULL,
    "tone" TEXT,
    "targetWords" INTEGER,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "currentChapterNo" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "logline" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "protagonistProfile" JSONB NOT NULL,
    "supportingCast" JSONB,
    "antagonistProfile" JSONB,
    "worldSetting" JSONB,
    "powerSystem" JSONB,
    "coreConflict" TEXT NOT NULL,
    "mainPlot" JSONB,
    "earlyStageHighlights" JSONB,
    "styleRules" JSONB,
    "lockedFields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryBible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "outlineType" "OutlineType" NOT NULL DEFAULT 'FULL_BOOK',
    "title" TEXT,
    "summary" TEXT,
    "structureData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "outlineId" TEXT,
    "volumeNo" INTEGER NOT NULL DEFAULT 1,
    "chapterNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "corePayoff" TEXT,
    "endingHook" TEXT,
    "status" "ChapterStatus" NOT NULL DEFAULT 'PLANNED',
    "wordCountTarget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterBrief" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "briefData" JSONB NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterDraft" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "draftNo" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "modelName" TEXT,
    "promptSnapshot" JSONB,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CharacterRole" NOT NULL DEFAULT 'SUPPORTING',
    "profile" JSONB NOT NULL,
    "personality" JSONB,
    "goals" JSONB,
    "currentStatus" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "WorldRuleCategory" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foreshadow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "setupChapterId" TEXT,
    "payoffChapterId" TEXT,
    "content" TEXT NOT NULL,
    "status" "ForeshadowStatus" NOT NULL DEFAULT 'PLANTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Foreshadow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryBible_projectId_key" ON "StoryBible"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Outline_projectId_key" ON "Outline"("projectId");

-- CreateIndex
CREATE INDEX "Chapter_projectId_volumeNo_idx" ON "Chapter"("projectId", "volumeNo");

-- CreateIndex
CREATE INDEX "Chapter_outlineId_idx" ON "Chapter"("outlineId");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_projectId_chapterNo_key" ON "Chapter"("projectId", "chapterNo");

-- CreateIndex
CREATE INDEX "ChapterBrief_chapterId_isCurrent_idx" ON "ChapterBrief"("chapterId", "isCurrent");

-- CreateIndex
CREATE INDEX "ChapterDraft_chapterId_isCurrent_idx" ON "ChapterDraft"("chapterId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterDraft_chapterId_draftNo_key" ON "ChapterDraft"("chapterId", "draftNo");

-- CreateIndex
CREATE INDEX "Character_projectId_role_idx" ON "Character"("projectId", "role");

-- CreateIndex
CREATE INDEX "WorldRule_projectId_category_idx" ON "WorldRule"("projectId", "category");

-- CreateIndex
CREATE INDEX "Foreshadow_projectId_status_idx" ON "Foreshadow"("projectId", "status");

-- CreateIndex
CREATE INDEX "Foreshadow_setupChapterId_idx" ON "Foreshadow"("setupChapterId");

-- CreateIndex
CREATE INDEX "Foreshadow_payoffChapterId_idx" ON "Foreshadow"("payoffChapterId");

-- AddForeignKey
ALTER TABLE "StoryBible" ADD CONSTRAINT "StoryBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outline" ADD CONSTRAINT "Outline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_outlineId_fkey" FOREIGN KEY ("outlineId") REFERENCES "Outline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterBrief" ADD CONSTRAINT "ChapterBrief_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterDraft" ADD CONSTRAINT "ChapterDraft_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldRule" ADD CONSTRAINT "WorldRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foreshadow" ADD CONSTRAINT "Foreshadow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foreshadow" ADD CONSTRAINT "Foreshadow_setupChapterId_fkey" FOREIGN KEY ("setupChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foreshadow" ADD CONSTRAINT "Foreshadow_payoffChapterId_fkey" FOREIGN KEY ("payoffChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
