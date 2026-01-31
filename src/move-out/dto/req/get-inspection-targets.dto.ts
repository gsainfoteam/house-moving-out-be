import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt } from 'class-validator';
import { Season } from 'generated/prisma/client';

export class GetInspectionTargetsDto {
  @ApiProperty({
    example: 2025,
    description: 'current semester year',
  })
  @Type(() => Number)
  @IsInt()
  currentYear: number;

  @ApiProperty({
    example: Season.SPRING,
    description: 'current semester season',
    enum: Season,
  })
  @IsEnum(Season)
  currentSeason: Season;

  @ApiProperty({
    example: 2025,
    description: 'next semester year',
  })
  @Type(() => Number)
  @IsInt()
  nextYear: number;

  @ApiProperty({
    example: Season.SUMMER,
    description: 'next semester season',
    enum: Season,
  })
  @IsEnum(Season)
  nextSeason: Season;
}
