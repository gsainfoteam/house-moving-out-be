/*
  Safe migration for inspection_target:

  1) Add nullable schedule_uuid column.
  2) Backfill schedule_uuid using (current_semester_uuid, next_semester_uuid).
  3) Enforce NOT NULL, add indexes, unique constraint, and FK.
  4) Drop old semester-based columns, indexes, and FKs.
*/

-- 1) Add nullable schedule_uuid column
ALTER TABLE "inspection_target"
ADD COLUMN "schedule_uuid" TEXT;

-- 2) Backfill schedule_uuid based on existing semester columns
UPDATE "inspection_target" it
SET "schedule_uuid" = mos."uuid"
FROM "move_out_schedule" mos
WHERE mos."current_semester_uuid" = it."current_semester_uuid"
  AND mos."next_semester_uuid" = it."next_semester_uuid";

-- 3) Enforce NOT NULL and add indexes/unique/FK
ALTER TABLE "inspection_target"
ALTER COLUMN "schedule_uuid" SET NOT NULL;

CREATE INDEX "inspection_target_schedule_uuid_idx"
ON "inspection_target"("schedule_uuid");

CREATE INDEX "inspection_target_schedule_uuid_house_name_room_number_idx"
ON "inspection_target"("schedule_uuid", "house_name", "room_number");

CREATE UNIQUE INDEX "inspection_target_schedule_uuid_admission_year_student_name_key"
ON "inspection_target"("schedule_uuid", "admission_year", "student_name");

ALTER TABLE "inspection_target"
ADD CONSTRAINT "inspection_target_schedule_uuid_fkey"
FOREIGN KEY ("schedule_uuid") REFERENCES "move_out_schedule"("uuid")
ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Drop old foreign keys, indexes, and columns
ALTER TABLE "inspection_target" DROP CONSTRAINT "inspection_target_current_semester_uuid_fkey";

ALTER TABLE "inspection_target" DROP CONSTRAINT "inspection_target_next_semester_uuid_fkey";

DROP INDEX "inspection_target_current_semester_uuid_idx";

DROP INDEX "inspection_target_current_semester_uuid_next_semester_uuid__idx";

DROP INDEX "inspection_target_current_semester_uuid_next_semester_uuid__key";

DROP INDEX "inspection_target_next_semester_uuid_idx";

ALTER TABLE "inspection_target"
DROP COLUMN "current_semester_uuid",
DROP COLUMN "next_semester_uuid";
