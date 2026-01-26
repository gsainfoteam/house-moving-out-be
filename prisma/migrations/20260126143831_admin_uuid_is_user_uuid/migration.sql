/*
  Warnings:

  - You are about to drop the column `user_uuid` on the `admin` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_user_uuid_fkey";

-- DropIndex
DROP INDEX "admin_user_uuid_key";

-- AlterTable
ALTER TABLE "admin" DROP COLUMN "user_uuid";

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_uuid_fkey" FOREIGN KEY ("uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
