/*
  Warnings:

  - You are about to drop the `admin_refresh_token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "admin_refresh_token" DROP CONSTRAINT "admin_refresh_token_admin_uuid_fkey";

-- DropTable
DROP TABLE "admin_refresh_token";
