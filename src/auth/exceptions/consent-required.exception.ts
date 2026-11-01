import { SessionRejected } from '@gsainfoteam/account-nest';
import { HttpStatus } from '@nestjs/common';

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
