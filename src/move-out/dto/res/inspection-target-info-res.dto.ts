import { ApiProperty } from '@nestjs/swagger';
import { InspectionTargetInfo } from 'generated/prisma/client';

export class InspectionTargetInfoResDto {
  constructor(target: InspectionTargetInfo) {
    this.uuid = target.uuid;
    this.houseName = target.houseName;
    this.roomNumber = target.roomNumber;
    this.students = [
      {
        name: target.student1Name,
        admissionYear: target.student1AdmissionYear,
      },
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
    ].filter((v): v is { name: string; admissionYear: string } => v !== null);
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
    example: [
      { name: '홍길동', admissionYear: '25' },
      { name: '김철수', admissionYear: '24' },
    ],
  })
  students: { name: string; admissionYear: string }[];

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
