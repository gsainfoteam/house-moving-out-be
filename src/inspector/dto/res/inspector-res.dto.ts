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
    example: [
      'd3b07384-d9a1-4f5c-8e2e-1234567890ab',
      'e4d909c2-7d2a-4f5c-9e3e-0987654321ba',
    ],
    description: 'Available inspection times',
    type: [String],
  })
  availableSlotIds: string[];
}
