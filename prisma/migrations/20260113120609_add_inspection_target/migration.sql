-- CreateEnum
CREATE TYPE "season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- CreateTable
CREATE TABLE "semester" (
    "uuid" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "season" "season" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "inspection_target" (
    "uuid" TEXT NOT NULL,
    "current_semester_uuid" TEXT NOT NULL,
    "next_semester_uuid" TEXT NOT NULL,
    "house_name" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "is_applied" BOOLEAN NOT NULL DEFAULT false,
    "is_passed" BOOLEAN,
    "re_inspection_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_target_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "semester_year_season_key" ON "semester"("year", "season");

-- CreateIndex
CREATE INDEX "inspection_target_current_semester_uuid_idx" ON "inspection_target"("current_semester_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_next_semester_uuid_idx" ON "inspection_target"("next_semester_uuid");

-- CreateIndex
CREATE INDEX "inspection_target_current_semester_uuid_next_semester_uuid__idx" ON "inspection_target"("current_semester_uuid", "next_semester_uuid", "house_name", "room_number");

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_current_semester_uuid_fkey" FOREIGN KEY ("current_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_target" ADD CONSTRAINT "inspection_target_next_semester_uuid_fkey" FOREIGN KEY ("next_semester_uuid") REFERENCES "semester"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
