-- CreateEnum
CREATE TYPE "OutputLanguage" AS ENUM ('ZH_CN', 'MS_MY');

-- CreateEnum
CREATE TYPE "TerminologyMode" AS ENUM ('KEEP_CN_TERMS', 'LOCALIZED_TERMS', 'HYBRID_TERMS');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "sourceLanguage" "OutputLanguage" NOT NULL DEFAULT 'ZH_CN',
ADD COLUMN "defaultOutputLanguage" "OutputLanguage" NOT NULL DEFAULT 'ZH_CN',
ADD COLUMN "terminologyMode" "TerminologyMode" NOT NULL DEFAULT 'KEEP_CN_TERMS';

-- AlterTable
ALTER TABLE "ChapterDraft"
ADD COLUMN "language" "OutputLanguage" NOT NULL DEFAULT 'ZH_CN',
ADD COLUMN "generationMode" TEXT DEFAULT 'original',
ADD COLUMN "translationOfDraftId" TEXT;
