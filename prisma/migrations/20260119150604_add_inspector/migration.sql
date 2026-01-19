/*
  Warnings:

  - The primary key for the `inspection_slot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `inspection_slot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "inspection_slot" DROP CONSTRAINT "inspection_slot_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "inspection_slot_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "inspector_available_slot" (
    "inspector_id" TEXT NOT NULL,
    "inspection_slot_id" INTEGER NOT NULL,

    CONSTRAINT "inspector_available_slot_pkey" PRIMARY KEY ("inspector_id","inspection_slot_id")
);

-- CreateTable
CREATE TABLE "inspector" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,

    CONSTRAINT "inspector_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspector_email_key" ON "inspector"("email");

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "inspector"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_available_slot" ADD CONSTRAINT "inspector_available_slot_inspection_slot_id_fkey" FOREIGN KEY ("inspection_slot_id") REFERENCES "inspection_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
