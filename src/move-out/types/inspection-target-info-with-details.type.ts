import {
  InspectionTargetInfo,
  InspectionApplication,
  InspectionSlot,
  User,
  Inspector,
} from 'generated/prisma/client';

export type InspectionApplicationWithDetail = InspectionApplication & {
  inspectionSlot: InspectionSlot;
  user: User;
  inspector: Inspector;
};

export type InspectionTargetInfoWithDetail = InspectionTargetInfo & {
  inspectionApplication: InspectionApplicationWithDetail[]; // Partial Unique Constraint 때문에 배열 형태
};
