import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateArticleVisibilityReqDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isVisible: boolean;
}
