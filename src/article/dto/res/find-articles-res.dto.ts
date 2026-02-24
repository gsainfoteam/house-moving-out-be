import { ApiProperty } from '@nestjs/swagger';
import { Article, ArticleType } from 'generated/prisma/client';

export class ArticleResDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  uuid: string;

  @ApiProperty({ example: ArticleType.NOTICE, enum: ArticleType })
  type: ArticleType;

  @ApiProperty({ example: '일정 변경 공지' })
  titleKo: string;

  @ApiProperty({ example: 'Notice for schedule change' })
  titleEn: string;

  @ApiProperty({ example: '일정을 하루 앞당깁니다.' })
  contentKo: string;

  @ApiProperty({ example: 'We are moving the schedule up by one day.' })
  contentEn: string;

  @ApiProperty({ example: true })
  isVisible: boolean;

  @ApiProperty({ example: '2026-02-21T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-21T00:00:00.000Z' })
  updatedAt: Date;

  constructor(article: Article) {
    this.uuid = article.uuid;
    this.type = article.type;
    this.titleKo = article.titleKo;
    this.titleEn = article.titleEn;
    this.contentKo = article.contentKo;
    this.contentEn = article.contentEn;
    this.isVisible = article.isVisible;
    this.createdAt = article.createdAt;
    this.updatedAt = article.updatedAt;
  }
}

export class FindArticlesResDto {
  @ApiProperty({ description: 'Total count of articles', example: 100 })
  totalCount: number;

  @ApiProperty({ type: [ArticleResDto] })
  articles: ArticleResDto[];

  constructor(articles: Article[], totalCount: number) {
    this.totalCount = totalCount;
    this.articles = articles.map((article) => new ArticleResDto(article));
  }
}
