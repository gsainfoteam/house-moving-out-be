import { ApiProperty } from '@nestjs/swagger';
import { InspectionTargetInfo } from 'generated/prisma/client';

class Student {
  @ApiProperty({
    description: 'Student name',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: 'Admission year',
    example: '25',
  })
  admissionYear: string;
}

export class InspectionTargetInfoResDto {
  constructor(target: InspectionTargetInfo) {
    this.uuid = target.uuid;
    this.houseName = target.houseName;
    this.roomNumber = target.roomNumber;
    this.students = [
      target.student1Name && target.student1AdmissionYear
        ? {
            name: target.student1Name,
            admissionYear: target.student1AdmissionYear,
          }
        : null,
      target.student2Name && target.student2AdmissionYear
        ? {
            name: target.student2Name,
            admissionYear: target.student2AdmissionYear,
          }
        : null,
      target.student3Name && target.student3AdmissionYear
        ? {
            name: target.student3Name,
            admissionYear: target.student3AdmissionYear,
          }
        : null,
    ].filter((v): v is Student => v !== null);
    this.applyCleaningService = target.applyCleaningService;
    this.createdAt = target.createdAt;
    this.updatedAt = target.updatedAt;
  }

  @ApiProperty({
    description: 'inspection target uuid',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  uuid: string;

  @ApiProperty({
    description: 'house name',
    example: 'XXX하우스-YYY동 1층',
  })
  houseName: string;

  @ApiProperty({
    description: 'room number',
    example: 'XXX101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'students in the room',
    type: [Student],
  })
  students: Student[];

  @ApiProperty({
    description: 'apply cleaning service',
    example: false,
  })
  applyCleaningService: boolean;

  @ApiProperty({
    description: 'created time',
    example: '2025-05-30T15:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'updated time',
    example: '2025-05-30T15:00:00.000Z',
  })
  updatedAt: Date;
}
