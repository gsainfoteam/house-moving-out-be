-- AlterTable
ALTER TABLE "inspection_application" ADD COLUMN     "inspector_signature_image" BYTEA,
ADD COLUMN     "item_results" JSONB,
ADD COLUMN     "target_signature_image" BYTEA;
