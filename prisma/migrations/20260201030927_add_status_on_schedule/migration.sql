-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "move_out_schedule" ADD COLUMN     "status" "ScheduleStatus" DEFAULT 'DRAFT';
UPDATE "move_out_schedule" SET "status" = 'DRAFT';
ALTER TABLE "move_out_schedule" ALTER COLUMN   "status" SET NOT NULL;
