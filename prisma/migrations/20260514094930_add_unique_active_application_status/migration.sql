-- Ensure only one active application exists per inspection target.
-- Active means deleted_at IS NULL and status is NULL or PENDING_NO_SHOW.
DROP INDEX IF EXISTS "unique_active_application";

CREATE UNIQUE INDEX "unique_active_application"
ON "inspection_application" ("inspection_target_info_uuid")
WHERE "deleted_at" IS NULL
  AND ("status" IS NULL OR "status" = 'PENDING_NO_SHOW');
