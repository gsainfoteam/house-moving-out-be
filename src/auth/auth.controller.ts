import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtToken } from './dto/res/jwtToken.dto';
import { IssueTokenType } from './types/jwtToken.type';
import { UserLoginDto } from './dto/req/userLogin.dto';
import { CreateNewPolicyDto } from './dto/req/createNewPolicy.dto';
import { CreateNewPolicyResponseDto } from './dto/res/createNewPolicyResponse.dto';
import { ConsentRequiredErrorDto } from './dto/res/consentRequiredError.dto';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { AdminGuard } from './guard/admin.guard';
import { GetAdmin } from './decorator/getAdmin.decorator';
import { UserGuard } from './guard/user.guard';
import { GetUser } from './decorator/getUser.decorator';
import { Admin, User } from 'generated/prisma/client';

@Controller('auth')
export class AuthController {
  private readonly adminRefreshTokenExpire: number;
  private readonly userRefreshTokenExpire: number;
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.adminRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('ADMIN_REFRESH_TOKEN_EXPIRE'),
    );
    this.userRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('USER_REFRESH_TOKEN_EXPIRE'),
    );
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Issue JWT token for admin',
  })
  @ApiOkResponse({ type: JwtToken, description: 'Return jwt token' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiOAuth2(['email', 'profile', 'student_id', 'phone_number'], 'oauth2')
  @Post('admin/login')
  async adminLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<JwtToken> {
    const auth = req.headers['authorization'];
    if (!auth) throw new UnauthorizedException();

    const { access_token, refresh_token } =
      await this.authService.adminLogin(auth);
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + this.adminRefreshTokenExpire),
      path: '/auth',
    });

    return { access_token };
  }

  @ApiOperation({
    summary: 'Refresh token',
    description: 'Refresh the access token for admin',
  })
  @ApiCreatedResponse({ type: JwtToken, description: 'Return jwt token' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @Post('admin/refresh')
  async adminRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<JwtToken> {
    const refreshToken = req.cookies['refresh_token'] as string;
    if (!refreshToken) throw new UnauthorizedException();

    const result: IssueTokenType =
      await this.authService.adminRefresh(refreshToken);
    const { access_token, refresh_token } = result;
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + this.adminRefreshTokenExpire),
      path: '/auth',
    });

    return { access_token };
  }

  @ApiOperation({
    summary: 'Logout',
    description:
      'Logout the admin from the cookie. Delete the refresh token from DB.',
  })
  @ApiOkResponse({ description: 'Logout' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @Post('admin/logout')
  @UseGuards(AdminGuard)
  async adminLogout(
    @GetAdmin() admin: Admin,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.adminLogout(admin.id);
    res.clearCookie('refresh_token', {
      path: '/auth',
    });
  }

  @ApiOperation({
    summary: 'Create New Policy Version',
    description:
      'Create a new policy version and set it as the latest active version. When a new policy version is created, all existing active policy versions of the same type (TERMS_OF_SERVICE or PRIVACY_POLICY) are automatically deactivated, and the newly created version becomes the active one. This endpoint is only accessible to admin users.',
  })
  @ApiBody({ type: CreateNewPolicyDto })
  @ApiCreatedResponse({
    type: CreateNewPolicyResponseDto,
    description: 'Policy version created successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiConflictResponse({ description: 'Policy version already exists' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @Post('admin/policy')
  @UseGuards(AdminGuard)
  async createNewPolicyVersion(
    @Body() createNewPolicyDto: CreateNewPolicyDto,
  ): Promise<CreateNewPolicyResponseDto> {
    return await this.authService.createNewPolicyVersion(createNewPolicyDto);
  }

  @ApiOperation({
    summary: 'User Login',
    description:
      'Issue JWT token. If consent required, returns 403 with CONSENT_REQUIRED or CONSENT_UPDATE_REQUIRED error.',
  })
  @ApiBody({
    type: UserLoginDto,
    required: false,
    description: 'Consent information (required only when consent needed)',
  })
  @ApiOkResponse({ type: JwtToken, description: 'Login success' })
  @ApiUnauthorizedResponse({ description: 'Invalid IDP token' })
  @ApiResponse({
    status: 403,
    description: 'Consent required',
    type: ConsentRequiredErrorDto,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiOAuth2(['email', 'profile', 'student_id', 'phone_number'], 'oauth2')
  @Post('user/login')
  async userLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: UserLoginDto,
  ): Promise<JwtToken> {
    const auth = req.headers['authorization'];
    if (!auth) throw new UnauthorizedException();

    const { access_token, refresh_token } = await this.authService.userLogin(
      auth,
      body,
    );

    res.cookie('user_refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + this.userRefreshTokenExpire),
      path: '/auth',
    });

    return { access_token };
  }

  @ApiOperation({
    summary: 'Refresh token',
    description: 'Refresh the access token for user',
  })
  @ApiCreatedResponse({ type: JwtToken, description: 'Return jwt token' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @Post('user/refresh')
  async userRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<JwtToken> {
    const refreshToken = req.cookies['user_refresh_token'] as string;
    if (!refreshToken) throw new UnauthorizedException();

    const result: IssueTokenType =
      await this.authService.userRefresh(refreshToken);
    const { access_token, refresh_token } = result;
    res.cookie('user_refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + this.userRefreshTokenExpire),
      path: '/auth',
    });

    return { access_token };
  }

  @ApiOperation({
    summary: 'Logout',
    description: 'Logout the user from the cookie. Delete the refresh token.',
  })
  @ApiOkResponse({ description: 'Logout' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @Post('user/logout')
  @UseGuards(UserGuard)
  async userLogout(
    @GetUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.userLogout(user.id);
    res.clearCookie('user_refresh_token', {
      path: '/auth',
    });
  }
}
