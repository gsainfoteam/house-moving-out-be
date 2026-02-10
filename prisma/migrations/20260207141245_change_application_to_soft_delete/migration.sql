/*
  Warnings:

  - Added the required column `delete_at` to the `inspection_application` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "inspection_application_inspection_target_info_uuid_key";

-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "deleted_at" TIMESTAMP(3);


