import { Gender, RoomInspectionType } from 'generated/prisma/client';

export type InspectionTargetStudent = {
  houseName: string;
  gender: Gender;
  roomNumber: string;
  roomCapacity: number;
  students: {
    studentName: string;
    studentNumber: string;
  }[];
  applyCleaningService: boolean;
  inspectionType: RoomInspectionType;
};
