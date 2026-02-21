import {
  Body,
  Post,
  ClassSerializerInterceptor,
  Controller,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleReqDto } from './dto/req/create-article-req.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { CreateArticleResDto } from './dto/res/create-article-res.dto';
import { ErrorDto } from 'src/common/dto/error.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({
    summary: 'Create Article (Notice/FAQ)',
    description:
      'Create a new article (Notice or FAQ) with both Korean and English content.',
  })
  @ApiCreatedResponse({
    description: 'The article has been successfully created.',
    type: CreateArticleResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorDto })
  @ApiInternalServerErrorResponse({
    description: 'Internal Server Error',
    type: ErrorDto,
  })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Post()
  async createArticle(
    @Body() createArticleReqDto: CreateArticleReqDto,
  ): Promise<CreateArticleResDto> {
    const article =
      await this.articleService.createArticle(createArticleReqDto);
    return { uuid: article.uuid };
  }
}
