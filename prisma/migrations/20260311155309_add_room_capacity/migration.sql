-- Add new columns as nullable first so existing data is preserved
ALTER TABLE "inspection_target"
  ADD COLUMN "room_capacity" INTEGER,
  ADD COLUMN "student1_student_number" TEXT,
  ADD COLUMN "student2_student_number" TEXT,
  ADD COLUMN "student3_student_number" TEXT;

-- Backfill room_capacity for existing rows
-- Existing rows have no explicit capacity 정보, 요구 사항에 따라 3으로 고정
UPDATE "inspection_target"
SET "room_capacity" = 3
WHERE "room_capacity" IS NULL;

-- Migrate admission year columns into new student_number columns
UPDATE "inspection_target"
SET
  "student1_student_number" = "student1_admission_year",
  "student2_student_number" = "student2_admission_year",
  "student3_student_number" = "student3_admission_year";

-- Now it is safe to drop old columns
ALTER TABLE "inspection_target"
  DROP COLUMN "student1_admission_year",
  DROP COLUMN "student2_admission_year",
  DROP COLUMN "student3_admission_year";

-- Enforce NOT NULL constraint after backfill
ALTER TABLE "inspection_target"
  ALTER COLUMN "room_capacity" SET NOT NULL;