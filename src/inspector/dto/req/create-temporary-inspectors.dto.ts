import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Gender } from 'generated/prisma/client';

export class TemporaryInspectorDto {
  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Temporary inspector email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Temporary inspector name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '20250000',
    description: 'Temporary inspector student number',
  })
  @IsString()
  studentNumber: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Temporary inspector gender',
    enum: Gender,
  })
  @IsEnum(Gender)
  gender: Gender;
}

export class CreateTemporaryInspectorsDto {
  @ApiProperty({
    description: 'List of temporary inspectors to be created',
    type: [TemporaryInspectorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemporaryInspectorDto)
  inspectors: TemporaryInspectorDto[];
}
