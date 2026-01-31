import { Module } from '@nestjs/common';
import { InfoteamAccountService } from './infoteam-account.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [InfoteamAccountService],
  exports: [InfoteamAccountService],
})
export class InfoteamAccountModule {}
