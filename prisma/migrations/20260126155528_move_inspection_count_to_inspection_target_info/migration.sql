/*
  Warnings:

  - You are about to drop the column `re_inspection_count` on the `inspection_application` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inspection_application" DROP COLUMN "re_inspection_count";

-- AlterTable
ALTER TABLE "inspection_target" ADD COLUMN     "inspection_count" INTEGER NOT NULL DEFAULT 0;
