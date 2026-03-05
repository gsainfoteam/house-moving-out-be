import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { PrismaModule } from '@lib/prisma';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [PrismaModule, DatabaseModule],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
