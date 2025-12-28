import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshTokenScheduler {
  private readonly logger = new Logger(RefreshTokenScheduler.name);
  constructor(private readonly authService: AuthService) {}

  @Cron('0 0 0 1 */6 *')
  async deleteExpiredRefreshTokens() {
    await this.authService.deleteExpiredRefreshTokens();
    this.logger.log('Expired refresh tokens have been deleted.');
  }
}
