import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Gender } from 'generated/prisma/client';

export class InspectorDto {
  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  @IsString()
  studentNumber: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Inspector gender',
    enum: Gender,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    example: [
      'd3b07384-d9a1-4f5c-8e2e-1234567890ab',
      'e4d909c2-7d2a-4f5c-9e3e-0987654321ba',
    ],
    description: 'Available inspection slot UUIDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  availableSlotUuids: string[];
}

export class CreateInspectorsDto {
  @ApiProperty({
    description: 'List of inspectors to be created',
    type: [InspectorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectorDto)
  inspectors: InspectorDto[];
}
