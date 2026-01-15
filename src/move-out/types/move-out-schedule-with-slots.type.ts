import { InspectionSlot, MoveOutSchedule } from 'generated/prisma/client';

export type MoveOutScheduleWithSlots = MoveOutSchedule & {
  inspectionSlots: InspectionSlot[];
};
