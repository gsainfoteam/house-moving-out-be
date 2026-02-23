import {
  InspectionApplication,
  InspectionSlot,
  InspectionTargetInfo,
  Inspector,
  User,
} from 'generated/prisma/client';

export type LatestApplicationWithDetails = InspectionApplication & {
  inspectionSlot: InspectionSlot;
  inspector: Inspector;
  user: User;
  inspectionTargetInfo: InspectionTargetInfo;
};
