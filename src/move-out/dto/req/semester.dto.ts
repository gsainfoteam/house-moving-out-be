import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt } from 'class-validator';
import { Season } from 'generated/prisma/client';

export class SemesterDto {
  @ApiProperty({
    example: 2025,
    description: 'year',
  })
  @Type(() => Number)
  @IsInt()
  year: number;

  @ApiProperty({
    example: Season.FALL,
    description: 'season',
    enum: Season,
  })
  @IsEnum(Season)
  season: Season;
}
