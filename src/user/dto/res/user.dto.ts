import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role, User } from 'generated/prisma/client';

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

  @ApiPropertyOptional({
    description: 'house name',
    example: 'G',
    type: String,
  })
  houseName?: string;

  @ApiProperty({
    description: 'role',
    enum: Role,
    example: Role.USER,
  })
  role: Role;

  @ApiProperty({
    description: 'whether user is inspector',
    example: true,
  })
  isInspector: boolean;

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

  constructor(
    user: User,
    target: { gender: Gender; houseName: string; roomNumber: string } | null,
    isInspector: boolean,
  ) {
    this.name = user.name;
    this.email = user.email;
    this.studentNumber = user.studentNumber;
    this.gender = target?.gender;
    this.roomNumber = target?.roomNumber;
    this.houseName = target?.houseName;
    this.role = user.role;
    this.isInspector = isInspector;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
