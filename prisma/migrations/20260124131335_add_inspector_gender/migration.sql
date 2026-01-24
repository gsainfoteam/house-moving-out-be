/*
  Warnings:

  - Added the required column `gender` to the `inspector` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "inspector" ADD COLUMN     "gender" "gender" NOT NULL;
