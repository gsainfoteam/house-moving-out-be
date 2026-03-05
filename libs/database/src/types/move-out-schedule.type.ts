import {
  InspectionSlot,
  MoveOutSchedule,
  Semester,
} from 'generated/prisma/client';

export type MoveOutScheduleWithSlots = MoveOutSchedule & {
  inspectionSlots: InspectionSlot[];
  currentSemester: Semester;
  nextSemester: Semester;
};
