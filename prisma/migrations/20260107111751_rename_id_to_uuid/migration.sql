/*
  Warnings:

  - The primary key for the `admin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `admin` table. All the data in the column will be lost.
  - The primary key for the `admin_refresh_token` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `admin_refresh_token` table. All the data in the column will be lost.
  - The primary key for the `policy_version` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `policy_version` table. All the data in the column will be lost.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user` table. All the data in the column will be lost.
  - The primary key for the `user_consent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user_consent` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_consent` table. All the data in the column will be lost.
  - The primary key for the `user_refresh_token` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user_refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_refresh_token` table. All the data in the column will be lost.
  - Added the required column `uuid` to the `admin` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `admin_refresh_token` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `policy_version` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `uuid` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_uuid` to the `user_consent` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `user_consent` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `user_uuid` to the `user_refresh_token` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `user_refresh_token` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "admin_refresh_token" DROP CONSTRAINT "admin_refresh_token_admin_uuid_fkey";

-- DropForeignKey
ALTER TABLE "user_consent" DROP CONSTRAINT "user_consent_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_refresh_token" DROP CONSTRAINT "user_refresh_token_user_id_fkey";

-- DropIndex
DROP INDEX "user_consent_user_id_consent_type_idx";

-- DropIndex
DROP INDEX "user_refresh_token_user_id_session_id_idx";

-- AlterTable
ALTER TABLE "admin" DROP CONSTRAINT "admin_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "admin_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "admin_refresh_token" DROP CONSTRAINT "admin_refresh_token_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "admin_refresh_token_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "policy_version" DROP CONSTRAINT "policy_version_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "policy_version_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "user_consent" DROP CONSTRAINT "user_consent_pkey",
DROP COLUMN "id",
DROP COLUMN "user_id",
ADD COLUMN     "user_uuid" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "user_consent_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "user_refresh_token" DROP CONSTRAINT "user_refresh_token_pkey",
DROP COLUMN "id",
DROP COLUMN "user_id",
ADD COLUMN     "user_uuid" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "user_refresh_token_pkey" PRIMARY KEY ("uuid");

-- CreateIndex
CREATE INDEX "user_consent_user_uuid_consent_type_idx" ON "user_consent"("user_uuid", "consent_type");

-- CreateIndex
CREATE INDEX "user_refresh_token_user_uuid_session_id_idx" ON "user_refresh_token"("user_uuid", "session_id");

-- AddForeignKey
ALTER TABLE "admin_refresh_token" ADD CONSTRAINT "admin_refresh_token_admin_uuid_fkey" FOREIGN KEY ("admin_uuid") REFERENCES "admin"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_token" ADD CONSTRAINT "user_refresh_token_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
