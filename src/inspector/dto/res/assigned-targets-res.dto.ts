import { ApplicationWithDetails } from '@lib/database';
import { ApiProperty } from '@nestjs/swagger';
import { RoomInspectionType } from 'generated/prisma/client';

class Resident {
  @ApiProperty({
    description: 'Student name',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: 'Student number',
    example: '20250000',
  })
  studentNumber: string;
}

export class AssignedTargetsResDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
    format: 'uuid',
  })
  uuid: string;

  @ApiProperty({
    description: 'House name',
    example: 'G',
  })
  houseName: string;

  @ApiProperty({
    description: 'Room number',
    example: 'XXX101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Residents in the room',
    type: [Resident],
  })
  residents: Resident[];

  @ApiProperty({
    description: 'Inspection time',
    example: '2026-01-22T03:30:00.000Z',
  })
  inspectionTime: Date;

  @ApiProperty({
    description: 'Inspection type',
    example: RoomInspectionType.SOLO,
    enum: RoomInspectionType,
  })
  inspectionType: RoomInspectionType;

  @ApiProperty({
    description: 'Whether the inspection is passed',
    example: true,
    nullable: true,
    type: Boolean,
  })
  isPassed: boolean | null;

  @ApiProperty({
    description: 'Inspection count',
    example: 2,
  })
  inspectionCount: number;

  @ApiProperty({
    description: 'Whether the document url is active',
    example: true,
    nullable: true,
  })
  isDocumentActive: boolean | null;

  constructor(app: ApplicationWithDetails) {
    this.uuid = app.uuid;
    this.houseName = app.inspectionTargetInfo.houseName;
    this.roomNumber = app.inspectionTargetInfo.roomNumber;
    this.residents = [
      app.inspectionTargetInfo.student1Name &&
      app.inspectionTargetInfo.student1StudentNumber
        ? {
            studentNumber: app.inspectionTargetInfo.student1StudentNumber,
            name: app.inspectionTargetInfo.student1Name,
          }
        : null,
      app.inspectionTargetInfo.student2Name &&
      app.inspectionTargetInfo.student2StudentNumber
        ? {
            studentNumber: app.inspectionTargetInfo.student2StudentNumber,
            name: app.inspectionTargetInfo.student2Name,
          }
        : null,
      app.inspectionTargetInfo.student3Name &&
      app.inspectionTargetInfo.student3StudentNumber
        ? {
            studentNumber: app.inspectionTargetInfo.student3StudentNumber,
            name: app.inspectionTargetInfo.student3Name,
          }
        : null,
    ].filter((v): v is { studentNumber: string; name: string } => v !== null);
    this.inspectionTime = app.inspectionSlot.startTime;
    this.inspectionType = app.inspectionTargetInfo.inspectionType;
    this.isPassed = app.isPassed;
    this.inspectionCount = app.inspectionTargetInfo.inspectionCount;
    this.isDocumentActive = app.isDocumentActive;
  }
}
