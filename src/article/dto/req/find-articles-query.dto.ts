import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleType } from 'generated/prisma/client';

export class FindArticlesQueryDto {
  @ApiProperty({
    description: 'Article type (NOTICE or FAQ)',
    enum: ArticleType,
    example: ArticleType.NOTICE,
  })
  @IsEnum(ArticleType)
  type: ArticleType;

  @ApiPropertyOptional({
    description: 'Pagination offset',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Pagination limit',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
