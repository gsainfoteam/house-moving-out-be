import { DatabaseService } from '@lib/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDatabaseSize() {
    const result = await this.databaseService.$queryRaw<
      { sum: string; pg_size_pretty: string }[]
    >`
      select
        sum(pg_database_size(pg_database.datname)),
        pg_size_pretty(sum(pg_database_size(pg_database.datname)))
      from pg_database;
    `;
    return {
      bytes: Number.parseInt(result[0].sum),
      pretty: result[0].pg_size_pretty,
    };
  }
}
