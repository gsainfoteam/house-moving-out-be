import { SessionRejected } from '@gsainfoteam/account-nest';
import { HttpStatus } from '@nestjs/common';

// SDK 가 403 과 ticket 으로 응답하고, details 에는 예전 403 body 를 그대로 실어 프론트가 같은 모양을 읽는다
export class ConsentRequiredException extends SessionRejected {
  constructor(
    message: string,
    errorCode: string,
    requiredConsents: {
      terms: { currentVersion?: string; requiredVersion: string };
      privacy: { currentVersion?: string; requiredVersion: string };
    },
  ) {
    super({
      message,
      errorCode,
      statusCode: HttpStatus.FORBIDDEN,
      requiredConsents,
    });
  }
}
