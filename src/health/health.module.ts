import { PrismaModule } from '@lib/prisma';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [PrismaModule, TerminusModule.forRoot({ errorLogStyle: 'json' })],
  controllers: [HealthController],
})
export class HealthModule {}
