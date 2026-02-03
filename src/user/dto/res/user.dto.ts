import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role } from 'generated/prisma/client';

export class UserDto {
  @ApiProperty({
    description: 'UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'name',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: 'email',
    example: 'test@gm.gist.ac.kr',
  })
  email: string;

  @ApiProperty({
    description: 'phone number',
    example: '+82 10 1234 5678',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'student number',
    example: '20250000',
  })
  studentNumber: string;

  @ApiPropertyOptional({
    description: 'student gender',
    example: Gender.MALE,
    enum: Gender,
  })
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'room number',
    example: 'G100',
    type: String,
  })
  roomNumber?: string;

  @ApiProperty({
    description: 'role',
    enum: Role,
    example: Role.USER,
  })
  role: Role;

  @ApiProperty({
    description: 'created at',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'updated at',
    example: '2026-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
