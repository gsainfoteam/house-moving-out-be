import { Loggable } from '@lib/logger';
import { PrismaService } from '@lib/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { CreateArticleType } from './types/create-article.type';

@Loggable()
@Injectable()
export class ArticleRepository {
  private readonly logger = new Logger(ArticleRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async createArticle(createArticleType: CreateArticleType) {
    return await this.prismaService.article.create({
      data: createArticleType,
    });
  }
}
