-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "inspection_count" INTEGER;

-- Update existing rows with 1
UPDATE "inspection_application" SET "inspection_count" = 1;

-- Make column NOT NULL
ALTER TABLE "inspection_application" ALTER COLUMN "inspection_count" SET NOT NULL;