/*
  Warnings:

  - Added the required column `inspector_uuid` to the `inspection_application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "inspector_uuid" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "inspection_application" ADD CONSTRAINT "inspection_application_inspector_uuid_fkey" FOREIGN KEY ("inspector_uuid") REFERENCES "inspector"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
