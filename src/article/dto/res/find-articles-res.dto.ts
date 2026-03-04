import { ApiProperty } from '@nestjs/swagger';
import { Article, ArticleType } from 'generated/prisma/client';

export class ArticleResDto {
  @ApiProperty({
    description: 'The UUID of the article',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'The type of the article (NOTICE or FAQ)',
    example: ArticleType.NOTICE,
    enum: ArticleType,
  })
  type: ArticleType;

  @ApiProperty({
    description: 'The title of the article in Korean',
    example: '일정 변경 공지',
  })
  titleKo: string;

  @ApiProperty({
    description: 'The title of the article in English',
    example: 'Notice for schedule change',
  })
  titleEn: string;

  @ApiProperty({
    description: 'Whether the article is visible to general users',
    example: true,
  })
  isVisible: boolean;

  @ApiProperty({
    description: 'The date and time when the article was created',
    example: '2026-02-21T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the article was last updated',
    example: '2026-02-21T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(article: Article) {
    this.uuid = article.uuid;
    this.type = article.type;
    this.titleKo = article.titleKo;
    this.titleEn = article.titleEn;
    this.isVisible = article.isVisible;
    this.createdAt = article.createdAt;
    this.updatedAt = article.updatedAt;
  }
}

export class FindArticlesResDto {
  @ApiProperty({
    description: 'Total count of articles matching the filters',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({
    description: 'List of articles for the current page',
    type: [ArticleResDto],
  })
  articles: ArticleResDto[];

  constructor(articles: Article[], totalCount: number) {
    this.totalCount = totalCount;
    this.articles = articles.map((article) => new ArticleResDto(article));
  }
}
