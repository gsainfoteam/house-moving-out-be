/*
  Warnings:

  - You are about to drop the column `is_passed` on the `inspection_application` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('PASSED', 'FAILED', 'PENDING_NO_SHOW', 'NO_SHOW');

-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "status" "application_status";

-- Data Migration
UPDATE "inspection_application" SET "status" = 'PASSED' WHERE "is_passed" = true;
UPDATE "inspection_application" SET "status" = 'FAILED' WHERE "is_passed" = false;

-- AlterTable
ALTER TABLE "inspection_application" DROP COLUMN "is_passed";
