import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { User } from 'generated/prisma/client';
import { AuthService } from './auth.service';
import { GetUser } from './decorator/get-user.decorator';
import { UserLoginDto } from './dto/req/user-login.dto';
import { ConsentRequiredErrorDto } from './dto/res/consent-required-error.dto';
import { JwtToken } from './dto/res/jwt-token.dto';
import { UserGuard } from './guard/user.guard';
import { IssueTokenType } from './types/jwt-token.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

    const { access_token, refresh_token, refreshTokenExpiredAt } =
      await this.authService.userLogin(auth, body);

    res.cookie('user_refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: refreshTokenExpiredAt,
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
    const { access_token, refresh_token, refreshTokenExpiredAt } = result;
    res.cookie('user_refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: refreshTokenExpiredAt,
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
    await this.authService.userLogout(user.uuid);
    res.clearCookie('user_refresh_token', {
      path: '/auth',
    });
  }
}
