-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "application_status" ADD VALUE 'CANCELED';
ALTER TYPE "application_status" ADD VALUE 'NO_SHOW_CANCELED';

UPDATE inspection_application SET status = 'CANCELED' WHERE deleted_at IS NOT NULL AND status IS NULL;
