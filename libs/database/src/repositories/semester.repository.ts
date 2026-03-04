import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { Prisma, Season, Semester } from 'generated/prisma/client';

@Loggable()
@Injectable()
export class SemesterRepository {
  private readonly logger = new Logger(SemesterRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findOrCreateSemester(year: number, season: Season): Promise<Semester> {
    return await this.prismaService.semester
      .upsert({
        where: {
          year_season: {
            year,
            season,
          },
        },
        update: {},
        create: {
          year,
          season,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findOrCreateSemester prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findOrCreateSemester error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
