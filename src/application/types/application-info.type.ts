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
