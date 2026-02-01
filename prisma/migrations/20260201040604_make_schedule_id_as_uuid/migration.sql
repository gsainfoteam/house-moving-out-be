/*
  Warnings:

  - You are about to drop the column `schedule_id` on the `inspection_slot` table. All the data in the column will be lost.
  - The primary key for the `move_out_schedule` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `move_out_schedule` table. All the data in the column will be lost.
  - Added the required column `schedule_uuid` to the `inspection_slot` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `move_out_schedule` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/

-- DropForeignKey
ALTER TABLE "inspection_slot" DROP CONSTRAINT "inspection_slot_schedule_id_fkey";

-- DropIndex
DROP INDEX "inspection_slot_schedule_id_start_time_idx";

-- AlterTable
ALTER TABLE "inspection_slot" DROP COLUMN "schedule_id",
ADD COLUMN     "schedule_uuid" TEXT NOT NULL;

-- AlterTable
TRUNCATE TABLE "move_out_schedule" CASCADE;
ALTER TABLE "move_out_schedule" DROP CONSTRAINT "move_out_schedule_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "move_out_schedule_pkey" PRIMARY KEY ("uuid");

-- CreateIndex
CREATE INDEX "inspection_slot_schedule_uuid_start_time_idx" ON "inspection_slot"("schedule_uuid", "start_time");

-- AddForeignKey
ALTER TABLE "inspection_slot" ADD CONSTRAINT "inspection_slot_schedule_uuid_fkey" FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
