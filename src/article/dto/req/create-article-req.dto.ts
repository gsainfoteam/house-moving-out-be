import { ApiProperty } from '@nestjs/swagger';
import { ArticleDto } from '../article.dto';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { ArticleType } from 'generated/prisma/client';
import { Type } from 'class-transformer';

export class CreateArticleReqDto {
  @ApiProperty({
    description: 'Type of Article(Notice,Faq)',
    example: ArticleType.NOTICE,
    enum: ArticleType,
  })
  @IsEnum(ArticleType)
  type: ArticleType;

  @ApiProperty({
    description: 'Articles in Korean and English',
    example: [
      {
        language: 'KO',
        title: '일정 변경 공지',
        content: '일정을 하루 앞당깁니다.',
      },
      {
        language: 'EN',
        title: 'Notice for schedule change',
        content: 'We are moving the schedule up by one day.',
      },
    ],
    type: [ArticleDto],
    maxItems: 2,
    minItems: 2,
  })
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ArticleDto)
  articles: ArticleDto[];

  @ApiProperty({
    description: 'Visibility of Article',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  isVisible: boolean;
}
