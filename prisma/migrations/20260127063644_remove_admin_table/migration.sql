/*
  Warnings:

  - You are about to drop the `admin_refresh_token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `admin_uuid` on the `audit_log` table. All the data in the column will be lost.
  - You are about to drop the `admin` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user_uuid` to the `audit_log` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admin_refresh_token" DROP CONSTRAINT "admin_refresh_token_admin_uuid_fkey";

-- DropTable
DROP TABLE "admin_refresh_token";
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_admin_uuid_fkey";

-- AlterTable
ALTER TABLE "audit_log" DROP COLUMN "admin_uuid",
ADD COLUMN     "user_uuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "admin";

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
