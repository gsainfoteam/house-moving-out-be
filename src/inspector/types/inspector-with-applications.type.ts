import { InspectionApplication, Inspector } from 'generated/prisma/client';

export type InspectorWithApplications = Inspector & {
  applications: InspectionApplication[];
};
