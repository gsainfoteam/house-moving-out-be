import { Loggable } from '@lib/logger';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { CreateArticleReqDto } from './dto/req/create-article-req.dto';
import { Language } from './dto/article.dto';
import { Role, User } from 'generated/prisma/client';
import { ArticleDetailResDto } from './dto/res/article-detail-res.dto';

@Loggable()
@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

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
}
