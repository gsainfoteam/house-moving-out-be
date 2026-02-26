-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "inspection_count" INTEGER;

-- Update existing rows with 0
UPDATE "inspection_application" SET "inspection_count" = 0;

-- Make column NOT NULL
ALTER TABLE "inspection_application" ALTER COLUMN "inspection_count" SET NOT NULL;