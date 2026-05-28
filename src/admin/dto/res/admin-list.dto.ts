import { ApiProperty } from '@nestjs/swagger';
import { AdminListItemDto } from './admin-list-item.dto';

export class AdminListDto {
  @ApiProperty({ type: [AdminListItemDto] })
  admins: AdminListItemDto[];

  constructor(admins: AdminListItemDto[]) {
    this.admins = admins;
  }
}
