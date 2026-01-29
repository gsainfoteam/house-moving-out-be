import { HttpException, HttpStatus } from '@nestjs/common';

export class ConsentRequiredException extends HttpException {
  constructor(
    message: string,
    errorCode: string,
    requiredConsents: {
      terms: { currentVersion?: string; requiredVersion: string };
      privacy: { currentVersion?: string; requiredVersion: string };
    },
  ) {
    super(
      {
        message,
        errorCode,
        statusCode: HttpStatus.FORBIDDEN,
        requiredConsents,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
