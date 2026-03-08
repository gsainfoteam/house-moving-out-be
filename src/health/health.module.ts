import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule, TerminusModule.forRoot({ errorLogStyle: 'json' })],
  controllers: [HealthController],
})
export class HealthModule {}
