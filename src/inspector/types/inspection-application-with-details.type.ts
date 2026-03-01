import {
  InspectionApplication,
  InspectionSlot,
  InspectionTargetInfo,
} from 'generated/prisma/client';

export type InspectionApplicationWithDetails = InspectionApplication & {
  inspectionSlot: InspectionSlot;
  inspectionTargetInfo: InspectionTargetInfo;
};
