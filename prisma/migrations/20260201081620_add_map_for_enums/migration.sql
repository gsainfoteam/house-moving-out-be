/*
  Warnings:

  - The `status` column on the `move_out_schedule` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "schedule_status" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "move_out_schedule" DROP COLUMN "status",
ADD COLUMN     "status" "schedule_status" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "user" DROP COLUMN "role",
ADD COLUMN     "role" "role" NOT NULL DEFAULT 'USER';

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "ScheduleStatus";
