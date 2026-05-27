import { ApiProperty } from '@nestjs/swagger';
import { Role, User } from 'generated/prisma/client';

export class AdminListItemDto {
  @ApiProperty({ example: 'd3b07384-d9a1-4f5c-8e2e-1234567890ab' })
  uuid: string;

  @ApiProperty({ example: Role.ADMIN, enum: Role })
  role: Role;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'test@gm.gist.ac.kr' })
  email: string;

  @ApiProperty({ example: '20250000' })
  studentNumber: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  constructor(
    user: Pick<
      User,
      'uuid' | 'role' | 'name' | 'email' | 'studentNumber' | 'createdAt'
    >,
  ) {
    this.uuid = user.uuid;
    this.role = user.role;
    this.name = user.name;
    this.email = user.email;
    this.studentNumber = user.studentNumber;
    this.createdAt = user.createdAt;
  }
}
