/*
  Warnings:

  - You are about to drop the column `re_inspection_count` on the `inspection_application` table. All the data in the column will be lost.
  - The `status` column on the `move_out_schedule` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "schedule_status" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "inspection_application" DROP COLUMN "re_inspection_count";

-- AlterTable
ALTER TABLE "inspection_target" ADD COLUMN     "inspection_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "move_out_schedule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "move_out_schedule" ALTER COLUMN "status" TYPE "schedule_status" USING ("status"::text::"schedule_status");
ALTER TABLE "move_out_schedule" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "role" USING ("role"::text::"role");
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "ScheduleStatus";

-- AlterTable
ALTER TABLE "inspection_slot"
ADD CONSTRAINT "InspectionSlot_maleReservedCount_check" CHECK ("male_reserved_count" >= 0),
ADD CONSTRAINT "InspectionSlot_femaleReservedCount_check" CHECK ("female_reserved_count" >= 0);

-- AlterTable
ALTER TABLE "inspection_target" ADD CONSTRAINT "InspectionTargetInfo_inspectionCount_check" CHECK ("inspection_count" >= 0);
