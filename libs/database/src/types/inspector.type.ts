import { InspectionSlot, Inspector } from 'generated/prisma/client';

export type InspectorWithSlots = Inspector & {
  availableSlots: {
    inspectionSlot: InspectionSlot;
  }[];
};
