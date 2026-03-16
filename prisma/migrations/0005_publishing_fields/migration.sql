-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publicSlug" TEXT,
ADD COLUMN "publicTitle" TEXT,
ADD COLUMN "publicIntro" TEXT,
ADD COLUMN "publicCoverData" TEXT;

-- AlterTable
ALTER TABLE "Chapter"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "publishedTitle" TEXT,
ADD COLUMN "publishedContent" TEXT,
ADD COLUMN "publishedCoverData" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicSlug_key" ON "Project"("publicSlug");
