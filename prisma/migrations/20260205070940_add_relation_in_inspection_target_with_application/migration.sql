/*
  Warnings:

  - You are about to drop the column `current_semester_uuid` on the `inspection_target` table. All the data in the column will be lost.
  - You are about to drop the column `next_semester_uuid` on the `inspection_target` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schedule_uuid,admission_year,student_name]` on the table `inspection_target` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schedule_uuid` to the `inspection_target` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inspection_target" DROP CONSTRAINT "inspection_target_current_semester_uuid_fkey";

-- DropForeignKey
ALTER TABLE "inspection_target" DROP CONSTRAINT "inspection_target_next_semester_uuid_fkey";

-- DropIndex
DROP INDEX "inspection_target_current_semester_uuid_idx";

-- DropIndex
DROP INDEX "inspection_target_current_semester_uuid_next_semester_uuid__idx";

-- DropIndex
DROP INDEX "inspection_target_current_semester_uuid_next_semester_uuid__key";

-- DropIndex
DROP INDEX "inspection_target_next_semester_uuid_idx";

-- AlterTable
ALTER TABLE "inspection_target" DROP COLUMN "current_semester_uuid",
DROP COLUMN "next_semester_uuid",
ADD COLUMN     "schedule_uuid" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "inspection_target_schedule_uuid_idx" ON "inspection_target"("schedule_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_schedule_uuid_house_name_room_number_idx" ON "inspection_target"("schedule_uuid", "house_name", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_target_schedule_uuid_admission_year_student_name_key" ON "inspection_target"("schedule_uuid", "admission_year", "student_name");

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
