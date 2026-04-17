import {
  InspectionSlot,
  Inspector,
  MoveOutScheduleOnInspector,
} from 'generated/prisma/client';

export type InspectorWithSlots = Inspector & {
  availableSlots: {
    inspectionSlot: InspectionSlot;
  }[];
  schedules: MoveOutScheduleOnInspector[];
};
