import {
  Body,
  Post,
  ClassSerializerInterceptor,
  Controller,
  UseGuards,
  UseInterceptors,
  Get,
  Param,
  Query,
  Patch,
  Delete,
  HttpCode,
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
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { CreateArticleResDto } from './dto/res/create-article-res.dto';
import { ErrorDto } from 'src/common/dto/error.dto';
import { UserGuard } from 'src/auth/guard/user.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { User } from 'generated/prisma/client';
import { FindArticlesQueryDto } from './dto/req/find-articles-query.dto';
import { FindArticlesResDto } from './dto/res/find-articles-res.dto';
import { ArticleDetailResDto } from './dto/res/article-detail-res.dto';
import { UpdateArticleVisibilityReqDto } from './dto/req/update-article-visibility-req.dto';

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
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
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

  @ApiOperation({
    summary: 'Find Article by UUID',
    description: 'Get a single article by its UUID.',
  })
  @ApiOkResponse({ type: ArticleDetailResDto })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get(':uuid')
  async findArticleByUuid(
    @GetUser() user: User,
    @Param('uuid') uuid: string,
  ): Promise<ArticleDetailResDto> {
    return await this.articleService.findArticleByUuid(user, uuid);
  }

  @ApiOperation({
    summary: 'Find Notice Articles',
    description: 'Get a paginated list of notice articles.',
  })
  @ApiOkResponse({ type: FindArticlesResDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('notice')
  async findNotices(
    @GetUser() user: User,
    @Query() query: FindArticlesQueryDto,
  ): Promise<FindArticlesResDto> {
    return await this.articleService.findNotices(user, query);
  }

  @ApiOperation({
    summary: 'Find FAQ Articles',
    description: 'Get a paginated list of FAQ articles.',
  })
  @ApiOkResponse({ type: FindArticlesResDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('faq')
  async findFaq(
    @GetUser() user: User,
    @Query() query: FindArticlesQueryDto,
  ): Promise<FindArticlesResDto> {
    return await this.articleService.findFaq(user, query);
  }

  @ApiOperation({
    summary: 'Update Article',
    description: 'Update an article by its UUID.',
  })
  @ApiOkResponse({ type: CreateArticleResDto })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async updateArticle(
    @Param('uuid') uuid: string,
    @Body() updateArticleDto: CreateArticleReqDto,
  ): Promise<CreateArticleResDto> {
    const article = await this.articleService.updateArticle(
      uuid,
      updateArticleDto,
    );
    return { uuid: article.uuid };
  }

  @ApiOperation({
    summary: 'Change Article Visibility',
    description: 'Toggle the visibility of an article.',
  })
  @ApiOkResponse({ type: CreateArticleResDto })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':uuid/visibility')
  async changeArticleVisibility(
    @Param('uuid') uuid: string,
    @Body() { isVisible }: UpdateArticleVisibilityReqDto,
  ): Promise<CreateArticleResDto> {
    const article = await this.articleService.changeArticleVisibility(
      uuid,
      isVisible,
    );
    return { uuid: article.uuid };
  }

  @ApiOperation({
    summary: 'Delete Article',
    description: 'Soft delete an article by its UUID.',
  })
  @ApiNoContentResponse({ description: 'Article successfully deleted' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Delete(':uuid')
  async deleteArticle(@Param('uuid') uuid: string): Promise<void> {
    await this.articleService.deleteArticle(uuid);
  }
}
