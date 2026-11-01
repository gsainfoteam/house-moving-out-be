import { SessionRejected } from '@gsainfoteam/account-nest';
import { HttpStatus } from '@nestjs/common';
import type { ConsentRequiredErrorDto } from '../dto/res/consent-required-error.dto';

export class ConsentRequiredException extends SessionRejected {
  constructor(
    message: string,
    errorCode: string,
    requiredConsents: ConsentRequiredErrorDto['requiredConsents'],
  ) {
    super({
      message,
      errorCode,
      statusCode: HttpStatus.FORBIDDEN,
      requiredConsents,
    });
  }
}
