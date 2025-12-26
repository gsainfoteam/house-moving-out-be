import { Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtToken } from './dto/jwtToken.dto';
import { Request } from 'express';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'Login',
    description: 'Issue admin JWT token',
  })
  @ApiOkResponse({ description: 'Return jwt token' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiOAuth2(['email', 'profile', 'openid'], 'oauth2')
  @Post('login')
  async login(@Req() req: Request): Promise<JwtToken> {
    const auth = req.headers['authorization'];
    if (!auth) throw new UnauthorizedException();

    return await this.adminService.login(auth);
  }
}
