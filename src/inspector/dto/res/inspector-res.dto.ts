import { ApiProperty } from '@nestjs/swagger';

export class InspectorResDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inspector UUID',
  })
  uuid: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  name: string;

  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  email: string;

  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  studentNumber: string;

  @ApiProperty({
    example: ['2026-01-01T10:00:00.000Z', '2026-01-02T14:00:00.000Z'],
    description: 'Available inspection times',
    type: [Date],
  })
  availableTimes: Date[];
}
