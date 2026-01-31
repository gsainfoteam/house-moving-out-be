import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InfoteamAccountUserInfoResponse } from './types/infoteam-account.type';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { UserInfo } from './types/userInfo.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InfoteamAccountService {
  private readonly logger = new Logger(InfoteamAccountService.name, {
    timestamp: true,
  });
  private readonly infoteamAccountUrl: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.infoteamAccountUrl = this.configService.getOrThrow<string>(
      'INFOTEAM_ACCOUNT_URL',
    );
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const userInfoResponse = await firstValueFrom(
      this.httpService
        .get<InfoteamAccountUserInfoResponse>(
          this.infoteamAccountUrl + '/userinfo',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            if (error instanceof AxiosError && error.response?.status === 401) {
              this.logger.debug('Invalid refresh token');
              throw new UnauthorizedException();
            }
            this.logger.error(error.message);
            throw new InternalServerErrorException();
          }),
        ),
    );

    const {
      sub: uuid,
      name,
      email,
      student_id: studentNumber,
      phone_number: phoneNumber,
      is_phone_number_verified: isPhoneNumberVerified,
      is_student_id_verified: isStudentIdVerified,
    } = userInfoResponse.data;

    if (!isPhoneNumberVerified) {
      throw new UnauthorizedException('Phone number not verified');
    }

    if (!isStudentIdVerified) {
      throw new UnauthorizedException('Student ID not verified');
    }

    return { uuid, name, email, studentNumber, phoneNumber };
  }
}
