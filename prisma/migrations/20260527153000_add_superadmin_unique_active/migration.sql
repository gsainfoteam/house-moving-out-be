-- This migration adds SUPERADMIN role and enforces that only one active SUPERADMIN exists.

-- 1) Extend enum "role" with value SUPERADMIN
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'SUPERADMIN'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'SUPERADMIN';
  END IF;
END
$$;
