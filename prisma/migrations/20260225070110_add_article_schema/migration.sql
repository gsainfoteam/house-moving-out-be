-- CreateEnum
CREATE TYPE "article_type" AS ENUM ('NOTICE', 'FAQ');

-- CreateTable
CREATE TABLE "article" (
    "uuid" TEXT NOT NULL,
    "type" "article_type" NOT NULL,
    "title_ko" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "content_ko" TEXT NOT NULL,
    "content_en" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "article_pkey" PRIMARY KEY ("uuid")
);
