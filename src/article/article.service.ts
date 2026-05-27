import { ArticleRepository } from '@lib/database';
import { Loggable } from '@lib/logger';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Article, User } from 'generated/prisma/client';
import { isAdminRole } from 'src/auth/utils/role.util';
import { Language } from './dto/article.dto';
import { CreateArticleReqDto } from './dto/req/create-article-req.dto';
import { FindArticlesQueryDto } from './dto/req/find-articles-query.dto';
import { ArticleDetailResDto } from './dto/res/article-detail-res.dto';
import { FindArticlesResDto } from './dto/res/find-articles-res.dto';
import { CreateArticleType } from './types/create-article.type';

@Loggable()
@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async createArticle(
    createArticleReqDto: CreateArticleReqDto,
  ): Promise<Article> {
    const createArticleType =
      this.extractMultilingualContent(createArticleReqDto);

    return await this.articleRepository.createArticle(createArticleType);
  }

  async findArticleByUuid(user: User, uuid: string) {
    const article = await this.articleRepository.findArticleByUuid(uuid);

    if (!isAdminRole(user.role) && !article.isVisible) {
      throw new ForbiddenException(
        'You do not have permission to view this article.',
      );
    }

    return new ArticleDetailResDto(article);
  }

  async findArticles(
    user: User,
    { type, offset, limit }: FindArticlesQueryDto,
  ): Promise<FindArticlesResDto> {
    const isVisible = isAdminRole(user.role) ? undefined : true;

    const [articles, totalCount] =
      await this.articleRepository.findArticlesByType(
        type,
        offset ?? 0,
        limit ?? 20,
        isVisible,
      );

    return new FindArticlesResDto(articles, totalCount);
  }

  async updateArticle(
    uuid: string,
    createArticleReqDto: CreateArticleReqDto,
  ): Promise<Article> {
    const createArticleType =
      this.extractMultilingualContent(createArticleReqDto);

    return await this.articleRepository.updateArticle(uuid, createArticleType);
  }

  async changeArticleVisibility(
    uuid: string,
    isVisible: boolean,
  ): Promise<Article> {
    await this.articleRepository.findArticleByUuid(uuid);
    return await this.articleRepository.updateArticleVisibility(
      uuid,
      isVisible,
    );
  }

  async deleteArticle(uuid: string): Promise<Article> {
    return await this.articleRepository.deleteArticle(uuid);
  }

  private extractMultilingualContent({
    type,
    articles,
    isVisible,
  }: CreateArticleReqDto): CreateArticleType {
    const koContent = articles.find((a) => a.language === Language.KO);
    const enContent = articles.find((a) => a.language === Language.EN);

    if (!koContent || !enContent) {
      throw new BadRequestException(
        'Both Korean and English articles must be provided.',
      );
    }
    return {
      type,
      titleKo: koContent.title,
      titleEn: enContent.title,
      contentKo: koContent.content,
      contentEn: enContent.content,
      isVisible,
    };
  }
}
