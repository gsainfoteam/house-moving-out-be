import { RoomInspectionType } from 'generated/prisma/client';

export type InspectionTargetStudent = {
  houseName: string;
  roomNumber: string;
  students: {
    studentName: string;
    admissionYear: string;
  }[];
  applyCleaningService: boolean;
  inspectionType: RoomInspectionType;
};
