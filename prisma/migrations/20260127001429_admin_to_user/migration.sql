/*
  Warnings:

  - You are about to drop the `admin_refresh_token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "admin_refresh_token" DROP CONSTRAINT "admin_refresh_token_admin_uuid_fkey";

-- DropTable
DROP TABLE "admin_refresh_token";

/*
  Warnings:

  - You are about to drop the column `name` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `student_number` on the `admin` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "admin" DROP COLUMN "name",
DROP COLUMN "phone_number",
DROP COLUMN "student_number";
