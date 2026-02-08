/*
  Warnings:

  - Added the required column `delete_at` to the `inspection_application` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "inspection_application_inspection_target_info_uuid_key";

-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "updated_at";

CREATE UNIQUE INDEX "unique_active_application" ON "inspection_application"("inspection_target_info_uuid") WHERE "is_passed" IS NULL AND "deleted_at" IS NULL;
