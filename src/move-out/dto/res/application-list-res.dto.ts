import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JsonValue } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import { InspectionSlot, Inspector, User } from 'generated/prisma/client';
import { ApplicationInfo } from 'src/move-out/types/application-info.type';

class UserInfoResDto {
  @ApiProperty({ description: 'User Name', example: 'Jane Doe' })
  name: string;

  @ApiProperty({ description: 'User Email', example: 'user@gm.gist.ac.kr' })
  email: string;

  @ApiProperty({ description: 'Student Number', example: '20250000' })
  studentNumber: string;

  constructor(partial: User) {
    this.name = partial.name;
    this.email = partial.email;
    this.studentNumber = partial.studentNumber;
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

  @ApiPropertyOptional({
    description: 'Whether inspection is passed',
    type: Boolean,
  })
  isPassed?: boolean | null;

  @ApiPropertyOptional({
    description: 'Inspection item results',
    type: ItemResultsResDto,
  })
  @Type(() => ItemResultsResDto)
  itemResults?: ItemResultsResDto | JsonValue;

  @ApiPropertyOptional({ description: 'Inspection document URL', type: String })
  document?: string | null;

  @ApiProperty({ description: 'Application created at' })
  createdAt: Date;

  constructor(partial: ApplicationInfo) {
    this.uuid = partial.uuid;
    this.user = new UserInfoResDto(partial.user);
    this.inspectionSlot = new SlotInfoResDto(partial.inspectionSlot);
    this.inspector = new InspectorInfoResDto(partial.inspector);
    this.isPassed = partial.isPassed;
    this.itemResults = partial.itemResults;
    this.document = partial.document;
    this.createdAt = partial.createdAt;
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
