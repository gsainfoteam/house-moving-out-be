import { ApiProperty } from '@nestjs/swagger';
import { InspectionTargetInfo } from 'generated/prisma/client';

export class InspectionTargetInfoResDto {
  constructor(target: InspectionTargetInfo) {
    this.uuid = target.uuid;
    this.houseName = target.houseName;
    this.roomNumber = target.roomNumber;
    this.studentName = target.studentName;
    this.admissionYear = target.admissionYear;
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
    description: 'student name',
    example: '홍길동',
  })
  studentName: string;

  @ApiProperty({
    description: 'admission year',
    example: '25',
  })
  admissionYear: string;

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
