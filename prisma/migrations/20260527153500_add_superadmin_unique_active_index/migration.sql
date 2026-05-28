-- Enforce that only one active SUPERADMIN exists.
-- This migration must run after the enum value 'SUPERADMIN' is added.

CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_superadmin"
ON "user"("role")
WHERE "deleted_at" IS NULL AND "role" = 'SUPERADMIN';

