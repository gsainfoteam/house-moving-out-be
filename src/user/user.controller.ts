import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from 'generated/prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { UserGuard } from 'src/auth/guard/user.guard';
import { UserDto } from './dto/res/user.dto';
import { UserService } from './user.service';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get Current User',
    description: 'Retrieve the profile of the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'The user profile has been successfully retrieved.',
    type: UserDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('me')
  async getMe(@GetUser() user: User): Promise<UserDto> {
    return await this.userService.getMe(user);
  }
}
