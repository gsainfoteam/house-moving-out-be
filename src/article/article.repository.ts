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
import { Article, ArticleType, Prisma } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaTransaction } from 'src/common/types';

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

  async createArticleInTx(
    data: CreateArticleType,
    tx: PrismaTransaction,
  ): Promise<Article> {
    return await tx.article
      .create({
        data,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException('Article already exists.');
          }
          this.logger.error(`createArticleInTx prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createArticleInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findArticlesByType(
    type: ArticleType,
    isAdmin: boolean,
    offset: number,
    limit: number,
  ): Promise<[Article[], number]> {
    const where: Prisma.ArticleWhereInput = {
      type,
      deletedAt: null,
      ...(!isAdmin && { isVisible: true }),
    };

    return await Promise.all([
      this.prismaService.article.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.article.count({ where }),
    ]).catch((error) => {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.error(`findArticlesByType prisma error: ${error.message}`);
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`findArticlesByType error: ${error}`);
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

  async updateArticleVisibility(
    uuid: string,
    isVisible: boolean,
  ): Promise<Article> {
    return await this.prismaService.article
      .update({
        where: { uuid, deletedAt: null },
        data: { isVisible },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new NotFoundException('Article not found.');
          }
          this.logger.error(
            `updateArticleVisibility prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateArticleVisibility error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteArticle(uuid: string): Promise<Article> {
    return await this.prismaService.article
      .update({
        where: { uuid, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new NotFoundException('Article not found.');
          }
          this.logger.error(`deleteArticle prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteArticle error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteArticleInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<Article> {
    return await tx.article
      .update({
        where: { uuid, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new NotFoundException('Article not found.');
          }
          this.logger.error(`deleteArticleInTx prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteArticleInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
