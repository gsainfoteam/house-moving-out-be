import { ApiProperty } from '@nestjs/swagger';
import { Season } from 'generated/prisma/client';

export class SemesterResDto {
  @ApiProperty({
    description: 'Semester UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  uuid: string;

  @ApiProperty({
    description: 'Semester year',
    example: 2025,
  })
  year: number;

  @ApiProperty({
    description: 'Semester season',
    enum: Season,
    example: Season.FALL,
  })
  season: Season;
}
