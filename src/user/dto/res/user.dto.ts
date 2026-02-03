import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Gender, Role } from 'generated/prisma/client';

export class UserDto {
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

  @Exclude()
  uuid: string;

  @Exclude()
  phoneNumber: string;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
