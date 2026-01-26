/*
  Warnings:

  - A unique constraint covering the columns `[user_uuid]` on the table `admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_uuid` to the `admin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- ALTER TABLE "admin" ADD COLUMN     "user_uuid" TEXT NOT NULL;

-- CreateIndex
-- CREATE UNIQUE INDEX "admin_user_uuid_key" ON "admin"("user_uuid");

-- AddForeignKey
-- ALTER TABLE "admin" ADD CONSTRAINT "admin_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
