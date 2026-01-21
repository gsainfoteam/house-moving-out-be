/*
  Warnings:

  - Added the required column `session_id` to the `admin_refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `user_refresh_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin_refresh_token" ADD COLUMN     "session_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user_refresh_token" ADD COLUMN     "session_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "admin_refresh_token_admin_uuid_session_id_idx" ON "admin_refresh_token"("admin_uuid", "session_id");

-- CreateIndex
CREATE INDEX "user_refresh_token_user_id_session_id_idx" ON "user_refresh_token"("user_id", "session_id");
