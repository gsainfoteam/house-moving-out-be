import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '@lib/database';
import { HealthService } from './health.service';

@Module({
  imports: [DatabaseModule, TerminusModule.forRoot({ errorLogStyle: 'json' })],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
