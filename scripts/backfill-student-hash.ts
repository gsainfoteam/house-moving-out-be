import 'dotenv/config';
/**
 * Recomputes student_hash / student_hashes using student-number-only hashing.
 *
 * Deployment order for existing environments:
 * 1. bun run backfill:student-hash -- --dry-run
 * 2. bun run backfill:student-hash
 * 3. Deploy application code that matches by student number only
 *
 * Requires the same AWS/KMS env vars as the application (see loadtest/seed-users.ts).
 */
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { EncryptionService } from '../libs/database/src/encryption.service';
import {
  ENCRYPTION_PURPOSE,
  EncryptionPurpose,
} from '../libs/database/src/constants/encryption.constants';

type BackfillOptions = {
  dryRun: boolean;
  batchSize: number;
};

type BackfillSummary = {
  users: { updated: number; skipped: number; errors: number };
  targets: { updated: number; skipped: number; errors: number };
  inspectors: { updated: number; skipped: number; errors: number };
};

function parseArgs(argv: string[]): BackfillOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw?.startsWith('--')) continue;
    const key = raw.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }
    args.set(key, value);
    i += 1;
  }

  return {
    dryRun: args.get('dry-run') === 'true',
    batchSize: Number(args.get('batch-size') ?? '100'),
  };
}

function createSummary(): BackfillSummary {
  return {
    users: { updated: 0, skipped: 0, errors: 0 },
    targets: { updated: 0, skipped: 0, errors: 0 },
    inspectors: { updated: 0, skipped: 0, errors: 0 },
  };
}

async function backfillUsers(
  prisma: PrismaClient,
  encryptionService: EncryptionService,
  options: BackfillOptions,
  summary: BackfillSummary,
) {
  const assignedHashes = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const users = await prisma.user.findMany({
      take: options.batchSize,
      ...(cursor ? { skip: 1, cursor: { uuid: cursor } } : {}),
      orderBy: { uuid: 'asc' },
      select: {
        uuid: true,
        studentHash: true,
        studentNumber: true,
      },
    });

    if (users.length === 0) break;
    cursor = users[users.length - 1]?.uuid;

    for (const user of users) {
      try {
        const studentNumber = await encryptionService.decrypt(
          user.studentNumber,
          ENCRYPTION_PURPOSE.USER.STUDENT_NUMBER,
          user.uuid,
        );

        if (!studentNumber) {
          console.error(`[user] skip uuid=${user.uuid}: empty studentNumber`);
          summary.users.errors += 1;
          continue;
        }

        const newHash = encryptionService.hash(studentNumber);
        if (user.studentHash === newHash) {
          assignedHashes.add(newHash);
          summary.users.skipped += 1;
          continue;
        }

        if (assignedHashes.has(newHash)) {
          console.error(
            `[user] skip uuid=${user.uuid}: duplicate studentNumber hash conflict`,
          );
          summary.users.errors += 1;
          continue;
        }

        const conflictingUser = await prisma.user.findUnique({
          where: { studentHash: newHash },
          select: { uuid: true },
        });
        if (conflictingUser && conflictingUser.uuid !== user.uuid) {
          console.error(
            `[user] skip uuid=${user.uuid}: studentHash already assigned to uuid=${conflictingUser.uuid}`,
          );
          summary.users.errors += 1;
          continue;
        }

        if (!options.dryRun) {
          await prisma.user.update({
            where: { uuid: user.uuid },
            data: { studentHash: newHash },
          });
        }

        assignedHashes.add(newHash);
        summary.users.updated += 1;
      } catch (error) {
        console.error(`[user] error uuid=${user.uuid}:`, error);
        summary.users.errors += 1;
      }
    }
  }
}

async function backfillInspectors(
  prisma: PrismaClient,
  encryptionService: EncryptionService,
  options: BackfillOptions,
  summary: BackfillSummary,
) {
  const assignedHashes = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const inspectors = await prisma.inspector.findMany({
      take: options.batchSize,
      ...(cursor ? { skip: 1, cursor: { uuid: cursor } } : {}),
      orderBy: { uuid: 'asc' },
      select: {
        uuid: true,
        studentHash: true,
        studentNumber: true,
      },
    });

    if (inspectors.length === 0) break;
    cursor = inspectors[inspectors.length - 1]?.uuid;

    for (const inspector of inspectors) {
      try {
        const studentNumber = await encryptionService.decrypt(
          inspector.studentNumber,
          ENCRYPTION_PURPOSE.INSPECTOR.STUDENT_NUMBER,
          inspector.uuid,
        );

        if (!studentNumber) {
          console.error(
            `[inspector] skip uuid=${inspector.uuid}: empty studentNumber`,
          );
          summary.inspectors.errors += 1;
          continue;
        }

        const newHash = encryptionService.hash(studentNumber);
        if (inspector.studentHash === newHash) {
          assignedHashes.add(newHash);
          summary.inspectors.skipped += 1;
          continue;
        }

        if (assignedHashes.has(newHash)) {
          console.error(
            `[inspector] skip uuid=${inspector.uuid}: duplicate studentNumber hash conflict`,
          );
          summary.inspectors.errors += 1;
          continue;
        }

        const conflictingInspector = await prisma.inspector.findUnique({
          where: { studentHash: newHash },
          select: { uuid: true },
        });
        if (
          conflictingInspector &&
          conflictingInspector.uuid !== inspector.uuid
        ) {
          console.error(
            `[inspector] skip uuid=${inspector.uuid}: studentHash already assigned to uuid=${conflictingInspector.uuid}`,
          );
          summary.inspectors.errors += 1;
          continue;
        }

        if (!options.dryRun) {
          await prisma.inspector.update({
            where: { uuid: inspector.uuid },
            data: { studentHash: newHash },
          });
        }

        assignedHashes.add(newHash);
        summary.inspectors.updated += 1;
      } catch (error) {
        console.error(`[inspector] error uuid=${inspector.uuid}:`, error);
        summary.inspectors.errors += 1;
      }
    }
  }
}

async function backfillTargets(
  prisma: PrismaClient,
  encryptionService: EncryptionService,
  options: BackfillOptions,
  summary: BackfillSummary,
) {
  let cursor: string | undefined;

  while (true) {
    const targets = await prisma.inspectionTargetInfo.findMany({
      take: options.batchSize,
      ...(cursor ? { skip: 1, cursor: { uuid: cursor } } : {}),
      orderBy: { uuid: 'asc' },
      select: {
        uuid: true,
        studentHashes: true,
        student1StudentNumber: true,
        student2StudentNumber: true,
        student3StudentNumber: true,
      },
    });

    if (targets.length === 0) break;
    cursor = targets[targets.length - 1]?.uuid;

    for (const target of targets) {
      try {
        const studentNumbers: string[] = [];
        const encryptedEntries: Array<{
          encryptedStudentNumber: string;
          purpose: EncryptionPurpose;
        }> = [];

        if (target.student1StudentNumber) {
          encryptedEntries.push({
            encryptedStudentNumber: target.student1StudentNumber,
            purpose: ENCRYPTION_PURPOSE.TARGET.STUDENT1_STUDENT_NUMBER,
          });
        }
        if (target.student2StudentNumber) {
          encryptedEntries.push({
            encryptedStudentNumber: target.student2StudentNumber,
            purpose: ENCRYPTION_PURPOSE.TARGET.STUDENT2_STUDENT_NUMBER,
          });
        }
        if (target.student3StudentNumber) {
          encryptedEntries.push({
            encryptedStudentNumber: target.student3StudentNumber,
            purpose: ENCRYPTION_PURPOSE.TARGET.STUDENT3_STUDENT_NUMBER,
          });
        }

        const decryptedStudentNumbers = await Promise.all(
          encryptedEntries.map(({ encryptedStudentNumber, purpose }) =>
            encryptionService.decrypt(
              encryptedStudentNumber,
              purpose,
              target.uuid,
            ),
          ),
        );

        for (const studentNumber of decryptedStudentNumbers) {
          if (studentNumber) {
            studentNumbers.push(studentNumber);
          }
        }

        const newHashes = [
          ...new Set(studentNumbers.map((n) => encryptionService.hash(n))),
        ];

        const isUnchanged =
          newHashes.length === target.studentHashes.length &&
          newHashes.every((hash) => target.studentHashes.includes(hash));

        if (isUnchanged) {
          summary.targets.skipped += 1;
          continue;
        }

        if (!options.dryRun) {
          await prisma.inspectionTargetInfo.update({
            where: { uuid: target.uuid },
            data: { studentHashes: newHashes },
          });
        }

        summary.targets.updated += 1;
      } catch (error) {
        console.error(`[target] error uuid=${target.uuid}:`, error);
        summary.targets.errors += 1;
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = createSummary();
  const configService = new ConfigService(process.env);
  const connectionString = configService.getOrThrow<string>('DATABASE_URL');
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const encryptionService = new EncryptionService(configService);

  try {
    await encryptionService.onModuleInit();
    await prisma.$connect();

    console.log(
      `Starting studentHash backfill (dryRun=${options.dryRun}, batchSize=${options.batchSize})`,
    );

    await backfillUsers(prisma, encryptionService, options, summary);
    await backfillInspectors(prisma, encryptionService, options, summary);
    await backfillTargets(prisma, encryptionService, options, summary);

    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: options.dryRun,
          summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
