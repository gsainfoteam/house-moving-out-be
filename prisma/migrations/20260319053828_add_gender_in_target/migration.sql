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
