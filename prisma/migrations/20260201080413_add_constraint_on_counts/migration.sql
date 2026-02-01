-- AlterTable
ALTER TABLE "inspection_slot"
ADD CONSTRAINT "InspectionSlot_maleReservedCount_check" CHECK ("male_reserved_count" >= 0),
ADD CONSTRAINT "InspectionSlot_femaleReservedCount_check" CHECK ("female_reserved_count" >= 0);

-- AlterTable
ALTER TABLE "inspection_target" ADD CONSTRAINT "InspectionTargetInfo_inspectionCount_check" CHECK ("inspection_count" >= 0);