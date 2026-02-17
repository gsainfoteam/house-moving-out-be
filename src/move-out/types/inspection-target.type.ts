import { InspectionType } from './inspection-type.enum';

export type InspectionTargetStudent = {
  houseName: string;
  roomNumber: string;
  students: {
    studentName: string;
    admissionYear: string;
  }[];
  applyCleaningService?: boolean;
  inspectionType: InspectionType;
};
