import { ArticleType } from 'generated/prisma/client';

export type CreateArticleType = {
  type: ArticleType;
  titleKo: string;
  titleEn: string;
  contentKo: string;
  contentEn: string;
  isVisible: boolean;
};
