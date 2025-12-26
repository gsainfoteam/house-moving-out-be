import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { IdpUserInfoResponse } from './types/idp.type';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { UserInfo } from './types/userInfo.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InfoteamIdpService {
  private readonly idpUrl: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.idpUrl = this.configService.get<string>('IDP_URL') as string;
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const userInfoResponse = await firstValueFrom(
      this.httpService
        .get<IdpUserInfoResponse>(this.idpUrl + '/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            if (error instanceof AxiosError && error.response?.status === 401) {
              throw new UnauthorizedException();
            }
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
    } = userInfoResponse.data;

    return { uuid, name, email, studentNumber, phoneNumber };
  }
}
