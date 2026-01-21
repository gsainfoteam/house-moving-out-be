/*
  Warnings:

  - The primary key for the `inspection_slot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `inspection_slot` table. All the data in the column will be lost.
  - You are about to drop the column `is_applied` on the `inspection_target` table. All the data in the column will be lost.
  - You are about to drop the column `is_passed` on the `inspection_target` table. All the data in the column will be lost.
  - You are about to drop the column `re_inspection_count` on the `inspection_target` table. All the data in the column will be lost.
  - You are about to drop the column `student_number` on the `inspection_target` table. All the data in the column will be lost.
  - The primary key for the `inspector_available_slot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `inspection_slot_id` on the `inspector_available_slot` table. All the data in the column will be lost.
  - You are about to drop the column `inspector_id` on the `inspector_available_slot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[current_semester_uuid,next_semester_uuid,admission_year,student_name]` on the table `inspection_target` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[current_semester_uuid,next_semester_uuid]` on the table `move_out_schedule` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `inspection_slot` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `admission_year` to the `inspection_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspection_slot_uuid` to the `inspector_available_slot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspector_uuid` to the `inspector_available_slot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `current_semester_uuid` to the `move_out_schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `next_semester_uuid` to the `move_out_schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inspector_available_slot" DROP CONSTRAINT "inspector_available_slot_inspection_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "inspector_available_slot" DROP CONSTRAINT "inspector_available_slot_inspector_id_fkey";

-- AlterTable
ALTER TABLE "inspection_slot" DROP CONSTRAINT "inspection_slot_pkey",
DROP COLUMN "id",
ADD COLUMN     "female_capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "female_reserved_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "male_capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "male_reserved_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "inspection_slot_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "inspection_target" DROP COLUMN "is_applied",
DROP COLUMN "is_passed",
DROP COLUMN "re_inspection_count",
DROP COLUMN "student_number",
ADD COLUMN     "admission_year" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "inspector_available_slot" DROP CONSTRAINT "inspector_available_slot_pkey",
DROP COLUMN "inspection_slot_id",
DROP COLUMN "inspector_id",
ADD COLUMN     "inspection_slot_uuid" TEXT NOT NULL,
ADD COLUMN     "inspector_uuid" TEXT NOT NULL,
ADD CONSTRAINT "inspector_available_slot_pkey" PRIMARY KEY ("inspector_uuid", "inspection_slot_uuid");

-- AlterTable
ALTER TABLE "move_out_schedule" ADD COLUMN     "current_semester_uuid" TEXT NOT NULL,
ADD COLUMN     "next_semester_uuid" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "inspection_application" (
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "inspection_target_info_uuid" TEXT NOT NULL,
    "inspection_slot_uuid" TEXT NOT NULL,
    "is_passed" BOOLEAN,
    "re_inspection_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_application_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "inspection_application_inspection_target_info_uuid_idx" ON "inspection_application"("inspection_target_info_uuid");

-- CreateIndex
CREATE INDEX "inspection_application_inspection_slot_uuid_idx" ON "inspection_application"("inspection_slot_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_application_inspection_target_info_uuid_key" ON "inspection_application"("inspection_target_info_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_admission_year_student_name_idx" ON "inspection_target"("admission_year", "student_name");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_target_current_semester_uuid_next_semester_uuid__key" ON "inspection_target"("current_semester_uuid", "next_semester_uuid", "admission_year", "student_name");

-- CreateIndex
CREATE UNIQUE INDEX "move_out_schedule_current_semester_uuid_next_semester_uuid_key" ON "move_out_schedule"("current_semester_uuid", "next_semester_uuid");

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_schedule" ADD CONSTRAINT "move_out_schedule_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_target_info_uuid_fkey" FOREIGN KEY ("inspection_target_info_uuid") REFERENCES "inspection_target"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspection_slot_uuid_fkey" FOREIGN KEY ("inspection_slot_uuid") REFERENCES "inspection_slot"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
