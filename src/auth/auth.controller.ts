import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtToken } from './dto/jwtToken.dto';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { AdminGuard } from './guard/admin.guard';

@Controller('auth')
export class AuthController {
  private readonly adminRefreshTokenExpire: number;
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.adminRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('ADMIN_REFRESH_TOKEN_EXPIRE'),
    );
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Issue JWT token for admin',
  })
  @ApiOkResponse({ description: 'Return jwt token' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiOAuth2(['email', 'profile', 'openid'], 'oauth2')
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
  async adminRefresh(@Req() req: Request): Promise<JwtToken> {
    const refreshToken = req.cookies['refresh_token'] as string;
    if (!refreshToken) throw new UnauthorizedException();

    return await this.authService.adminRefresh(refreshToken);
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies['refresh_token'] as string;
    res.clearCookie('refresh_token');

    return await this.authService.adminLogout(refreshToken);
  }
}
