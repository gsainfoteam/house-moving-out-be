import {
  InspectionApplication,
  InspectionSlot,
  InspectionTargetInfo,
  Inspector,
  User,
} from 'generated/prisma/client';

export type ApplicationInfo = InspectionApplication & {
  user: User;
  inspector: Inspector;
  inspectionSlot: InspectionSlot;
  inspectionTargetInfo: InspectionTargetInfo;
};

export type ApplicationWithDetails = InspectionApplication & {
  inspectionSlot: InspectionSlot;
  inspectionTargetInfo: InspectionTargetInfo;
};

export type InspectionApplicationWithSlot = InspectionApplication & {
  inspectionSlot: InspectionSlot;
};
