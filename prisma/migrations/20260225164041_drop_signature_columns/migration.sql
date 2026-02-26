/*
  Warnings:

  - You are about to drop the column `inspector_signature_image` on the `inspection_application` table. All the data in the column will be lost.
  - You are about to drop the column `target_signature_image` on the `inspection_application` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "inspection_target_schedule_uuid_house_name_room_number_idx";

-- AlterTable
ALTER TABLE "inspection_application" DROP COLUMN "inspector_signature_image",
DROP COLUMN "target_signature_image",
ADD COLUMN     "document" TEXT,
ADD COLUMN     "is_document_active" BOOLEAN;
