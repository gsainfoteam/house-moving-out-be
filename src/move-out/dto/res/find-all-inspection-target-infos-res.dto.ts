class Resident {
  admissionYear: string;
  name: string;
}
/* enum InspectionType {
  Full,
  Solo,
  Duo,
} */

export class InspectionTargetsGroupedByRoom {
  roomNumber: string;
  residents: Resident[];
  // inspectionType: InspectionType;
  inspectionCount: number;
  lastInspectionTime: Date;
  isPassed?: boolean;
}

export class FindAllInspectionTargetsResDto {
  inspectionTargetsGroupedByRooms: InspectionTargetsGroupedByRoom[];
}
