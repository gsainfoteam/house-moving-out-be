-- Ensure only one active application exists per inspection target.
-- Active means deleted_at IS NULL and status is NULL or PENDING_NO_SHOW.
DROP INDEX IF EXISTS "unique_active_application";

WITH ranked_active_applications AS (
  SELECT
    "uuid",
    ROW_NUMBER() OVER (
      PARTITION BY "inspection_target_info_uuid"
      ORDER BY "created_at" DESC, "uuid" DESC
    ) AS row_num
  FROM "inspection_application"
  WHERE "deleted_at" IS NULL
    AND ("status" IS NULL OR "status" = 'PENDING_NO_SHOW')
)
UPDATE "inspection_application" ia
SET "status" = 'CANCELED'
FROM ranked_active_applications raa
WHERE ia."uuid" = raa."uuid"
  AND raa.row_num > 1;

CREATE UNIQUE INDEX "unique_active_application"
ON "inspection_application" ("inspection_target_info_uuid")
WHERE "deleted_at" IS NULL
  AND ("status" IS NULL OR "status" = 'PENDING_NO_SHOW');
