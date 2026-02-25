import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Loggable } from '@lib/logger';
import { PrismaService } from '@lib/prisma';
import { CreateArticleType } from './types/create-article.type';
import { Article } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Loggable()
@Injectable()
export class ArticleRepository {
  private readonly logger = new Logger(ArticleRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async createArticle(data: CreateArticleType): Promise<Article> {
    return await this.prismaService.article
      .create({
        data,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException('Article already exists.');
          }
          this.logger.error(`createArticle prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createArticle error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findArticleByUuid(uuid: string): Promise<Article> {
    return await this.prismaService.article
      .findUniqueOrThrow({
        where: { uuid, deletedAt: null },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new NotFoundException('Article not found.');
          }
          this.logger.error(`findArticleByUuid prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findArticleByUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
