import { InspectionTargetInfo } from 'generated/prisma/client';
import { InspectionApplicationWithSlot } from './inspection-application.type';

export type InspectionTargetInfoWithApplication = InspectionTargetInfo & {
  inspectionApplication: InspectionApplicationWithSlot[]; // Partial Unique Constraint 때문에 배열 형태
};
