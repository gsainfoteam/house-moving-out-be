import { Loggable } from '@lib/logger';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { CreateArticleReqDto } from './dto/req/create-article-req.dto';
import { Language } from './dto/article.dto';
import { ArticleType, Role, User } from 'generated/prisma/client';
import { FindArticlesQueryDto } from './dto/req/find-articles-query.dto';
import { FindArticlesResDto } from './dto/res/find-articles-res.dto';
import { ArticleDetailResDto } from './dto/res/article-detail-res.dto';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async createArticle(createArticleReqDto: CreateArticleReqDto) {
    const { type, isVisible, articles } = createArticleReqDto;

    const koContent = articles.find((a) => a.language === Language.KO);
    const enContent = articles.find((a) => a.language === Language.EN);

    if (!koContent || !enContent) {
      throw new BadRequestException(
        'Both Korean and English articles must be provided.',
      );
    }

    return await this.articleRepository.createArticle({
      type,
      titleKo: koContent.title,
      titleEn: enContent.title,
      contentKo: koContent.content,
      contentEn: enContent.content,
      isVisible,
    });
  }

  async findArticleByUuid(user: User, uuid: string) {
    const article = await this.articleRepository.findArticleByUuid(uuid);

    if (user.role !== Role.ADMIN && !article.isVisible) {
      throw new ForbiddenException(
        'You do not have permission to view this article.',
      );
    }

    return new ArticleDetailResDto(article);
  }

  async findArticlesByType(
    type: ArticleType,
    user: User,
    { offset, limit }: FindArticlesQueryDto,
  ): Promise<FindArticlesResDto> {
    const isAdmin = user.role === Role.ADMIN;

    const [articles, totalCount] =
      await this.articleRepository.findArticlesByType(
        type,
        isAdmin,
        offset ?? 0,
        limit ?? 20,
      );

    return new FindArticlesResDto(articles, totalCount);
  }

  async updateArticle(uuid: string, createArticleReqDto: CreateArticleReqDto) {
    const { type, isVisible, articles } = createArticleReqDto;

    const koContent = articles.find((a) => a.language === Language.KO);
    const enContent = articles.find((a) => a.language === Language.EN);

    if (!koContent || !enContent) {
      throw new BadRequestException(
        'Both Korean and English articles must be provided.',
      );
    }

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        await this.articleRepository.DeleteArticleInTx(uuid, tx);

        return await this.articleRepository.createArticleInTx(
          {
            type,
            titleKo: koContent.title,
            titleEn: enContent.title,
            contentKo: koContent.content,
            contentEn: enContent.content,
            isVisible,
          },
          tx,
        );
      },
    );
  }

  async changeArticleVisibility(uuid: string, isVisible: boolean) {
    await this.articleRepository.findArticleByUuid(uuid);
    return await this.articleRepository.updateArticleVisibility(
      uuid,
      isVisible,
    );
  }

  async deleteArticle(uuid: string) {
    await this.articleRepository.findArticleByUuid(uuid);
    return await this.articleRepository.DeleteArticle(uuid);
  }
}
