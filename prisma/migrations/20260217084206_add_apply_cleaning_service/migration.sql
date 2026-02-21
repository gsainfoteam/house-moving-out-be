/*
  Warnings:

  - You are about to drop the column `admission_year` on the `inspection_target` table. All the data in the column will be lost.
  - You are about to drop the column `student_name` on the `inspection_target` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schedule_uuid,house_name,room_number]` on the table `inspection_target` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `student1_admission_year` to the `inspection_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student1_name` to the `inspection_target` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "inspection_target_admission_year_student_name_idx";

-- DropIndex
DROP INDEX "inspection_target_schedule_uuid_admission_year_student_name_key";

-- Step 0: Create room_inspection_type enum for inspection_type column
CREATE TYPE "room_inspection_type" AS ENUM ('FULL', 'SOLO', 'DUO', 'EMPTY');

-- Step 1: Add new columns
ALTER TABLE "inspection_target" 
ADD COLUMN     "apply_cleaning_service" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "student1_admission_year" TEXT,
ADD COLUMN     "student1_name" TEXT,
ADD COLUMN     "student2_admission_year" TEXT,
ADD COLUMN     "student2_name" TEXT,
ADD COLUMN     "student3_admission_year" TEXT,
ADD COLUMN     "student3_name" TEXT,
ADD COLUMN     "inspection_type" "room_inspection_type";

-- Step 1.5: Backfill existing rows with conservative default (FULL)
UPDATE "inspection_target"
SET "inspection_type" = 'FULL'
WHERE "inspection_type" IS NULL;

-- Step 1.6: Enforce NOT NULL on inspection_type after backfill
ALTER TABLE "inspection_target"
ALTER COLUMN "inspection_type" SET NOT NULL;

-- Step 2: Migrate existing data - copy current student_name/admission_year to student1
UPDATE "inspection_target"
SET 
  "student1_name" = "student_name",
  "student1_admission_year" = "admission_year"
WHERE "student1_name" IS NULL;

-- Step 3: Merge rows by room - for each room, keep one row and merge residents
-- This must happen BEFORE adding unique constraint to avoid duplicate key errors
WITH room_groups AS (
  SELECT 
    "schedule_uuid",
    "house_name",
    "room_number",
    MIN("uuid") as keeper_uuid,
    COUNT(*) as resident_count,
    jsonb_agg(
      jsonb_build_object(
        'uuid', "uuid",
        'student_name', "student_name",
        'admission_year', "admission_year",
        'inspection_count', "inspection_count",
        'created_at', "created_at"
      ) ORDER BY "created_at" ASC
    ) as residents
  FROM "inspection_target"
  GROUP BY "schedule_uuid", "house_name", "room_number"
),
resident_data AS (
  SELECT 
    rg.keeper_uuid,
    rg.resident_count,
    (rg.residents->0->>'student_name')::TEXT as r1_name,
    (rg.residents->0->>'admission_year')::TEXT as r1_year,
    CASE WHEN jsonb_array_length(rg.residents) > 1 THEN (rg.residents->1->>'student_name')::TEXT ELSE NULL END as r2_name,
    CASE WHEN jsonb_array_length(rg.residents) > 1 THEN (rg.residents->1->>'admission_year')::TEXT ELSE NULL END as r2_year,
    CASE WHEN jsonb_array_length(rg.residents) > 2 THEN (rg.residents->2->>'student_name')::TEXT ELSE NULL END as r3_name,
    CASE WHEN jsonb_array_length(rg.residents) > 2 THEN (rg.residents->2->>'admission_year')::TEXT ELSE NULL END as r3_year,
    GREATEST(
      COALESCE((rg.residents->0->>'inspection_count')::INTEGER, 0),
      COALESCE((rg.residents->1->>'inspection_count')::INTEGER, 0),
      COALESCE((rg.residents->2->>'inspection_count')::INTEGER, 0),
      COALESCE((rg.residents->3->>'inspection_count')::INTEGER, 0)
    ) as max_inspection_count
  FROM room_groups rg
  WHERE jsonb_array_length(rg.residents) > 0
)
UPDATE "inspection_target" it
SET 
  "student1_name" = COALESCE(rd.r1_name, it."student1_name"),
  "student1_admission_year" = COALESCE(rd.r1_year, it."student1_admission_year"),
  "student2_name" = rd.r2_name,
  "student2_admission_year" = rd.r2_year,
  "student3_name" = rd.r3_name,
  "student3_admission_year" = rd.r3_year,
  "inspection_count" = COALESCE(rd.max_inspection_count, it."inspection_count")
FROM resident_data rd
WHERE it."uuid" = rd.keeper_uuid
  AND rd.resident_count <= 3;

-- Step 4: Update all inspection_application FK to point to the keeper row
UPDATE "inspection_application" ia
SET "inspection_target_info_uuid" = (
  SELECT MIN(it2."uuid")
  FROM "inspection_target" it1
  JOIN "inspection_target" it2 ON 
    it1."schedule_uuid" = it2."schedule_uuid" AND
    it1."house_name" = it2."house_name" AND
    it1."room_number" = it2."room_number"
  WHERE it1."uuid" = ia."inspection_target_info_uuid"
  GROUP BY it2."schedule_uuid", it2."house_name", it2."room_number"
)
WHERE EXISTS (
  SELECT 1 FROM "inspection_target" it
  WHERE it."uuid" = ia."inspection_target_info_uuid"
);

-- Step 5: Delete duplicate rows (keep only the keeper row for each room)
-- This must happen BEFORE unique constraint to avoid duplicate key errors
DELETE FROM "inspection_target" it1
WHERE EXISTS (
  SELECT 1 FROM "inspection_target" it2
  WHERE it2."schedule_uuid" = it1."schedule_uuid"
    AND it2."house_name" = it1."house_name"
    AND it2."room_number" = it1."room_number"
    AND it2."uuid" < it1."uuid"
);

-- Step 6: Drop old columns
ALTER TABLE "inspection_target"
  DROP COLUMN "admission_year",
  DROP COLUMN "student_name";

-- Step 7: Add unique constraint (now safe after removing duplicates)
CREATE UNIQUE INDEX "inspection_target_schedule_uuid_house_name_room_number_key" ON "inspection_target"("schedule_uuid", "house_name", "room_number");
