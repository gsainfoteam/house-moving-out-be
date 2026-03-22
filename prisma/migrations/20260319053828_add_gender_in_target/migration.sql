-- Add gender column (nullable first for backfill)
ALTER TABLE "inspection_target" ADD COLUMN "gender" "gender";

-- Backfill from house_name: (남) -> MALE, (여) -> FEMALE
UPDATE "inspection_target"
SET "gender" = 'MALE'
WHERE "house_name" ~ '\(남\)\s*$';

UPDATE "inspection_target"
SET "gender" = 'FEMALE'
WHERE "house_name" ~ '\(여\)\s*$';

-- Enforce NOT NULL
ALTER TABLE "inspection_target" ALTER COLUMN "gender" SET NOT NULL;

-- Normalize house_name: strip trailing gender token and '하우스'
UPDATE "inspection_target"
SET "house_name" = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE("house_name", '\s*\((남|여)\)\s*$', ''),
    '하우스',
    '',
    'g'
  )
);

-- Normalize room_number: strip '호'
UPDATE "inspection_target"
SET "room_number" = TRIM(REGEXP_REPLACE("room_number", '\s*호\s*', '', 'g'))
WHERE "room_number" ~ '\s*호\s*';

-- Ensure UUID generator exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add normalized columns
ALTER TABLE "inspection_slot"
  ADD COLUMN "gender" "gender",
  ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reserved_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows as MALE rows
UPDATE "inspection_slot"
SET
  "gender" = 'MALE',
  "capacity" = "male_capacity",
  "reserved_count" = "male_reserved_count";

-- Insert FEMALE rows paired by time range
INSERT INTO "inspection_slot" (
  "uuid",
  "schedule_uuid",
  "start_time",
  "end_time",
  "gender",
  "capacity",
  "reserved_count"
)
SELECT
  gen_random_uuid()::text,
  "schedule_uuid",
  "start_time",
  "end_time",
  'FEMALE'::"gender",
  "female_capacity",
  "female_reserved_count"
FROM "inspection_slot";

-- Redirect existing inspection applications to gendered slots
UPDATE "inspection_application" ia
SET "inspection_slot_uuid" = s_f.uuid
FROM "inspection_slot" s_m,
     "inspection_target" it,
     "inspection_slot" s_f
WHERE
  ia.inspection_slot_uuid = s_m.uuid
  AND it.uuid = ia.inspection_target_info_uuid
  AND s_f.schedule_uuid = s_m.schedule_uuid
  AND s_f.start_time = s_m.start_time
  AND s_f.end_time = s_m.end_time
  AND s_f.gender = 'FEMALE'
  AND s_m.gender = 'MALE'
  AND it.gender = 'FEMALE';

-- Duplicate inspector availability to FEMALE rows
INSERT INTO "inspector_available_slot" ("inspector_uuid", "inspection_slot_uuid")
SELECT
  ias.inspector_uuid,
  s_f.uuid
FROM "inspector_available_slot" ias
JOIN "inspector" i ON i.uuid = ias.inspector_uuid
JOIN "inspection_slot" s_m ON s_m.uuid = ias.inspection_slot_uuid
JOIN "inspection_slot" s_f ON
  s_f.schedule_uuid = s_m.schedule_uuid
  AND s_f.start_time = s_m.start_time
  AND s_f.end_time = s_m.end_time
  AND s_f.gender = 'FEMALE'
WHERE s_m.gender = 'MALE'
  AND i.gender = 'FEMALE'
ON CONFLICT DO NOTHING;

-- Remove mismatched inspector-slot availability by gender
DELETE FROM "inspector_available_slot" ias
USING "inspector" i, "inspection_slot" s
WHERE
  ias.inspector_uuid = i.uuid
  AND ias.inspection_slot_uuid = s.uuid
  AND i.gender <> s.gender;

-- Enforce NOT NULL for gender
ALTER TABLE "inspection_slot" ALTER COLUMN "gender" SET NOT NULL;

-- Drop old check constraints
ALTER TABLE "inspection_slot" DROP CONSTRAINT IF EXISTS "InspectionSlot_maleReservedCount_check";
ALTER TABLE "inspection_slot" DROP CONSTRAINT IF EXISTS "InspectionSlot_femaleReservedCount_check";

-- Add new check constraint
ALTER TABLE "inspection_slot"
  ADD CONSTRAINT "InspectionSlot_reservedCount_check" CHECK ("reserved_count" >= 0);

-- Drop legacy columns
ALTER TABLE "inspection_slot"
  DROP COLUMN "male_capacity",
  DROP COLUMN "female_capacity",
  DROP COLUMN "male_reserved_count",
  DROP COLUMN "female_reserved_count";

-- Uniqueness for gendered slots
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_slot_schedule_uuid_start_time_end_time_gender_key"
  ON "inspection_slot"("schedule_uuid", "start_time", "end_time", "gender");

-- Drop legacy index (replaced by unique key)
DROP INDEX IF EXISTS "inspection_slot_schedule_uuid_start_time_idx";
