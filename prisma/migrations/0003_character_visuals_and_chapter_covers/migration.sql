-- AlterTable
ALTER TABLE "Character"
ADD COLUMN "appearancePromptZh" TEXT,
ADD COLUMN "appearancePromptEn" TEXT,
ADD COLUMN "negativePrompt" TEXT,
ADD COLUMN "referenceImageData" TEXT,
ADD COLUMN "identityLockNotes" TEXT,
ADD COLUMN "isVisualAnchor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChapterCover" (
  "id" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "characterId" TEXT,
  "scenePrompt" TEXT NOT NULL,
  "shotPrompt" TEXT,
  "moodPrompt" TEXT,
  "finalPrompt" TEXT NOT NULL,
  "negativePrompt" TEXT,
  "imageData" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'image/png',
  "modelName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChapterCover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterCover_chapterId_createdAt_idx" ON "ChapterCover"("chapterId", "createdAt");

-- CreateIndex
CREATE INDEX "ChapterCover_characterId_idx" ON "ChapterCover"("characterId");

-- AddForeignKey
ALTER TABLE "ChapterCover"
ADD CONSTRAINT "ChapterCover_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCover"
ADD CONSTRAINT "ChapterCover_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
