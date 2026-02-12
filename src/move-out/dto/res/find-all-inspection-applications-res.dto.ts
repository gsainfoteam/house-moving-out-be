export class DetailedApplication {
  uuid: string;
  roomNumber: string;
  studentName: string;
  phoneNumber: string;
  applicationTime: Date;
  inspectionTime: Date;
  // inspectionType:InspectionType;
  inspectorName: string;
  isPassed?: boolean;
}
export class FindAllInspectionApplicationsResDto {
  detailedApplications: DetailedApplication[];
}
