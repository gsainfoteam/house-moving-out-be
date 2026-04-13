/*
  Warnings:

  - You are about to drop the column `is_temporary` on the `inspector` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inspector" DROP COLUMN "is_temporary";

-- AlterTable
ALTER TABLE "move_out_schedule_on_inspector" ADD COLUMN     "is_temporary" BOOLEAN NOT NULL DEFAULT false;
