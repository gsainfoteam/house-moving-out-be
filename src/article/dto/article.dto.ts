import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum Language {
  KO = 'KO',
  EN = 'EN',
}
export class ArticleDto {
  @ApiProperty({
    description: 'Language of Article',
    example: Language.KO,
    enum: Language,
  })
  @IsEnum(Language)
  language: Language;

  @ApiProperty({
    description: 'Title of Article',
    example: '일정 변경 공지',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Content of Article',
    example: '일정을 하루 앞당깁니다.',
  })
  @IsString()
  content: string;
}
