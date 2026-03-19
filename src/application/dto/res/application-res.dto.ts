import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JsonValue } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import {
  InspectionSlot,
  Inspector,
  User,
  InspectionTargetInfo,
  RoomInspectionType,
  Gender,
} from 'generated/prisma/client';
import { ApplicationInfo } from '@lib/database';

class UserInfoResDto {
  @ApiProperty({ description: 'User Name', example: 'Jane Doe' })
  name: string;

  @ApiProperty({ description: 'User Email', example: 'user@gm.gist.ac.kr' })
  email: string;

  @ApiProperty({ description: 'Student Number', example: '20250000' })
  studentNumber: string;

  @ApiProperty({ description: 'Phone Number', example: '+82 10-1234-5678' })
  phoneNumber: string;

  constructor(partial: User) {
    this.name = partial.name;
    this.email = partial.email;
    this.studentNumber = partial.studentNumber;
    this.phoneNumber = partial.phoneNumber;
  }
}

class SlotInfoResDto {
  @ApiProperty({
    description: 'Slot Start Time',
    example: '2026-02-18T09:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Slot End Time',
    example: '2026-02-18T09:30:00Z',
  })
  endTime: Date;

  constructor(partial: InspectionSlot) {
    this.startTime = partial.startTime;
    this.endTime = partial.endTime;
  }
}

class InspectorInfoResDto {
  @ApiProperty({ description: 'Inspector Name', example: 'Jane Doe' })
  name: string;

  @ApiProperty({
    description: 'Inspector Email',
    example: 'user@gm.gist.ac.kr',
  })
  email: string;

  @ApiProperty({ description: 'Student Number', example: '20250000' })
  studentNumber: string;

  constructor(partial: Inspector) {
    this.name = partial.name;
    this.email = partial.email;
    this.studentNumber = partial.studentNumber;
  }
}

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

class TargetInfoResDto {
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

  @ApiPropertyOptional({
    description: 'Residents in the room',
    type: [Resident],
    nullable: true,
  })
  residents: Resident[] | null;

  @ApiProperty({
    description: 'Inspection type',
    example: RoomInspectionType.SOLO,
    enum: RoomInspectionType,
  })
  inspectionType: RoomInspectionType;

  @ApiProperty({
    description: 'Whether the applicant applied for cleaning service',
    example: true,
  })
  applyCleaningService: boolean;

  @ApiProperty({
    description: 'Gender of the room',
    example: Gender.MALE,
    enum: Gender,
  })
  gender: Gender;

  constructor(partial: InspectionTargetInfo) {
    this.houseName = partial.houseName;
    this.roomNumber = partial.roomNumber;
    this.residents = [
      partial.student1Name && partial.student1StudentNumber
        ? {
            name: partial.student1Name,
            studentNumber: partial.student1StudentNumber,
          }
        : null,
      partial.student2Name && partial.student2StudentNumber
        ? {
            name: partial.student2Name,
            studentNumber: partial.student2StudentNumber,
          }
        : null,
      partial.student3Name && partial.student3StudentNumber
        ? {
            name: partial.student3Name,
            studentNumber: partial.student3StudentNumber,
          }
        : null,
    ].filter(
      (res): res is { name: string; studentNumber: string } => res !== null,
    );
    this.inspectionType = partial.inspectionType;
    this.applyCleaningService = partial.applyCleaningService;
    this.gender = partial.gender;
  }
}

class ItemResultsResDto {
  @ApiProperty({ description: 'Passed items', example: ['floor', 'window'] })
  passed: string[];

  @ApiProperty({ description: 'Failed items', example: ['wall'] })
  failed: string[];
}

export class ApplicationResDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '12345678-0000-0000-a456-aaaaaabbbbbb',
  })
  uuid: string;

  @ApiProperty({ type: UserInfoResDto })
  @Type(() => UserInfoResDto)
  user: UserInfoResDto;

  @ApiProperty({ type: SlotInfoResDto })
  @Type(() => SlotInfoResDto)
  inspectionSlot: SlotInfoResDto;

  @ApiProperty({ type: InspectorInfoResDto })
  @Type(() => InspectorInfoResDto)
  inspector: InspectorInfoResDto;

  @ApiProperty({ type: TargetInfoResDto })
  @Type(() => TargetInfoResDto)
  targetInfo: TargetInfoResDto;

  @ApiProperty({
    description: 'Whether inspection is passed',
    type: Boolean,
    nullable: true,
  })
  isPassed: boolean | null;

  @ApiProperty({
    description: 'Inspection item results',
    type: ItemResultsResDto,
    nullable: true,
  })
  @Type(() => ItemResultsResDto)
  itemResults: ItemResultsResDto | JsonValue;

  @ApiProperty({
    description: 'Inspection document URL (Expires in 10 minutes)',
    type: String,
    nullable: true,
  })
  document?: string | null;

  @ApiProperty({ description: 'Application created at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Inspection count at the time of application (1-3)',
    example: 1,
  })
  inspectionCount: number;

  constructor(partial: ApplicationInfo) {
    this.uuid = partial.uuid;
    this.user = new UserInfoResDto(partial.user);
    this.inspectionSlot = new SlotInfoResDto(partial.inspectionSlot);
    this.inspector = new InspectorInfoResDto(partial.inspector);
    this.targetInfo = new TargetInfoResDto(partial.inspectionTargetInfo);
    this.isPassed = partial.isPassed;
    this.itemResults = partial.itemResults;
    this.document = partial.isDocumentActive ? partial.document : null;
    this.createdAt = partial.createdAt;
    this.inspectionCount = partial.inspectionCount;
  }
}

export class ApplicationListResDto {
  @ApiProperty({ type: [ApplicationResDto] })
  @Type(() => ApplicationResDto)
  applications: ApplicationResDto[];

  @ApiProperty({ description: 'Total count of applications' })
  totalCount: number;

  constructor(applications: ApplicationInfo[], totalCount: number) {
    this.applications = applications.map((app) => new ApplicationResDto(app));
    this.totalCount = totalCount;
  }
}
