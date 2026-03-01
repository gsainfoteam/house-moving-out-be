import {
  InspectionTargetInfo,
  InspectionApplication,
  InspectionSlot,
} from 'generated/prisma/client';

export type InspectionApplicationWithSlot = InspectionApplication & {
  inspectionSlot: InspectionSlot;
};

export type InspectionTargetInfoWithApplication = InspectionTargetInfo & {
  inspectionApplication: InspectionApplicationWithSlot[]; // Partial Unique Constraint 때문에 배열 형태
};
