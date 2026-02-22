import {
  InspectionApplication,
  InspectionSlot,
  InspectionTargetInfo,
} from 'generated/prisma/client';

export type InspectorApplicationWithDetails = InspectionApplication & {
  inspectionSlot: InspectionSlot;
  inspectionTargetInfo: InspectionTargetInfo;
};
