/*
  Warnings:

  - You are about to drop the column `application_end_date` on the `move_out_schedule` table. All the data in the column will be lost.
  - You are about to drop the column `application_start_date` on the `move_out_schedule` table. All the data in the column will be lost.
  - You are about to drop the column `inspection_end_date` on the `move_out_schedule` table. All the data in the column will be lost.
  - You are about to drop the column `inspection_start_date` on the `move_out_schedule` table. All the data in the column will be lost.
  - Added the required column `application_end_time` to the `move_out_schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_start_time` to the `move_out_schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "move_out_schedule" DROP COLUMN "application_end_date",
DROP COLUMN "application_start_date",
DROP COLUMN "inspection_end_date",
DROP COLUMN "inspection_start_date",
ADD COLUMN     "application_end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "application_start_time" TIMESTAMP(3) NOT NULL;
