import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from 'generated/prisma/client';
import ms, { StringValue } from 'ms';
import jwt from 'jsonwebtoken';
import { EncryptionService } from '../libs/database/src/encryption.service';
import { ENCRYPTION_PURPOSE } from '../libs/database/src/constants/encryption.constants';

type SeedUsersOptions = {
  count: number;
  prefix: string;
  role: Role;
  tokensPath: string;
  outputPath?: string;
};

function parseArgs(argv: string[]): SeedUsersOptions {
  const defaultCount = Number(process.env['SEED_USERS_COUNT'] ?? '50');
  const defaultPrefix = process.env['SEED_USERS_PREFIX'] ?? 'loadtest';
  const defaultRole = (process.env['SEED_USERS_ROLE'] ?? 'USER') as Role;
  const defaultTokensPath =
    process.env['SEED_USERS_TOKENS_PATH'] ?? 'loadtest/k6/tokens.json';
  const defaultOutputPath =
    process.env['SEED_USERS_OUTPUT_PATH'] ?? 'loadtest/k6/users.json';

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

  const count = Number(args.get('count') ?? defaultCount);
  const prefix = String(args.get('prefix') ?? defaultPrefix);
  const role = String(args.get('role') ?? defaultRole) as Role;
  const tokensPath = String(args.get('tokensPath') ?? defaultTokensPath);
  const outputPath = String(args.get('outputPath') ?? defaultOutputPath);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(
      `Invalid --count: ${String(args.get('count') ?? defaultCount)}`,
    );
  }
  if (!prefix.trim()) throw new Error('Invalid --prefix (empty)');
  if (!Object.values(Role).includes(role)) {
    throw new Error(
      `Invalid --role: ${role}. Allowed: ${Object.values(Role).join(', ')}`,
    );
  }
  if (!tokensPath.trim()) throw new Error('Invalid --tokensPath (empty)');

  return { count, prefix, role, tokensPath, outputPath };
}

function pad4(n: number) {
  return String(n).padStart(4, '0');
}

function makePhoneNumber(n: number) {
  const mid = String(1000 + (n % 9000)).slice(0, 4);
  const last = String(1000 + ((n * 7) % 9000)).slice(0, 4);
  return `010-${mid}-${last}`;
}

function makeName(n: number) {
  const family = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
  const given = [
    '민준',
    '서준',
    '도윤',
    '예준',
    '시우',
    '하준',
    '지우',
    '서연',
    '지민',
    '수아',
  ];
  return `${family[n % family.length]}${given[n % given.length]}`;
}

function makeStudentNumber(n: number) {
  const year = 20 + (n % 6); // 20~25
  const serial = String((n % 9999) + 1).padStart(4, '0');
  return `20${year}${serial}`;
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64').replace(/[+/=]/g, '');
}

function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

function hashRefreshToken(token: string, hmacSecret: string): string {
  return createHmac('sha256', hmacSecret).update(token).digest('hex');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configService = new ConfigService(process.env);

  const connectionString = configService.getOrThrow<string>('DATABASE_URL');
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const encryptionService = new EncryptionService(configService);
  const refreshTokenHmacSecret = configService.getOrThrow<string>(
    'REFRESH_TOKEN_HMAC_SECRET',
  );

  const userJwtSecret = configService.getOrThrow<string>('USER_JWT_SECRET');
  const userJwtExpire =
    configService.getOrThrow<StringValue>('USER_JWT_EXPIRE');
  const userJwtAudience = configService.getOrThrow<string>('USER_JWT_AUDIENCE');
  const userJwtIssuer = configService.getOrThrow<string>('USER_JWT_ISSUER');
  const userRefreshTokenExpire = configService.getOrThrow<StringValue>(
    'USER_REFRESH_TOKEN_EXPIRE',
  );

  const runId = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);

  try {
    await encryptionService.onModuleInit();
    await prisma.$connect();

    const results = await Promise.all(
      Array.from({ length: options.count }).map(async (_, idx) => {
        const n = idx + 1;
        const name = `${makeName(n)}${n}`;
        const studentNumber = makeStudentNumber(n);
        const email = `${options.prefix}.${runId}.${pad4(n)}@example.com`;
        const phoneNumber = makePhoneNumber(n);

        const studentHash = encryptionService.hash(name, studentNumber);

        const existing = await prisma.user.findUnique({
          where: { studentHash },
          select: { uuid: true },
        });
        const uuid = existing?.uuid ?? randomUUID();
        const wasCreated = !existing;

        const [
          encryptedName,
          encryptedEmail,
          encryptedPhoneNumber,
          encryptedStudentNumber,
        ] = await Promise.all([
          encryptionService.encrypt(name, ENCRYPTION_PURPOSE.USER.NAME, uuid),
          encryptionService.encrypt(email, ENCRYPTION_PURPOSE.USER.EMAIL, uuid),
          encryptionService.encrypt(
            phoneNumber,
            ENCRYPTION_PURPOSE.USER.PHONE_NUMBER,
            uuid,
          ),
          encryptionService.encrypt(
            studentNumber,
            ENCRYPTION_PURPOSE.USER.STUDENT_NUMBER,
            uuid,
          ),
        ]);

        const user = await prisma.user.upsert({
          where: { studentHash },
          create: {
            uuid,
            studentHash,
            name: encryptedName!,
            email: encryptedEmail!,
            phoneNumber: encryptedPhoneNumber!,
            studentNumber: encryptedStudentNumber!,
            role: options.role,
          },
          update: {
            name: encryptedName!,
            email: encryptedEmail!,
            phoneNumber: encryptedPhoneNumber!,
            studentNumber: encryptedStudentNumber!,
            role: options.role,
            deletedAt: null,
          },
          select: {
            uuid: true,
            studentHash: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await prisma.userRefreshToken.deleteMany({
          where: { userUuid: user.uuid },
        });

        const refreshToken = generateOpaqueToken();
        const sessionId = generateSessionId();
        const hashedToken = hashRefreshToken(
          refreshToken,
          refreshTokenHmacSecret,
        );
        const refreshTokenExpiredAt = new Date(
          Date.now() + ms(userRefreshTokenExpire),
        );

        await prisma.userRefreshToken.create({
          data: {
            userUuid: user.uuid,
            refreshToken: hashedToken,
            sessionId,
            expiredAt: refreshTokenExpiredAt,
          },
          select: { uuid: true },
        });

        const accessToken = jwt.sign({ sessionId }, userJwtSecret, {
          subject: user.uuid,
          expiresIn: userJwtExpire,
          algorithm: 'HS256',
          audience: userJwtAudience,
          issuer: userJwtIssuer,
        });

        return {
          wasCreated,
          uuid: user.uuid,
          studentHash: user.studentHash,
          role: user.role,
          name,
          email,
          phoneNumber,
          studentNumber,
          sessionId,
          access_token: accessToken,
          refresh_token: refreshToken,
          refreshTokenExpiredAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
    );

    const created = results.filter((r) => r.wasCreated);
    const updated = results.filter((r) => !r.wasCreated);
    const tokens = results.map((r) => r.access_token);

    await writeFile(
      options.tokensPath,
      `${JSON.stringify(tokens, null, 2)}\n`,
      'utf8',
    );
    if (options.outputPath) {
      await writeFile(
        options.outputPath,
        `${JSON.stringify(results, null, 2)}\n`,
        'utf8',
      );
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          ok: true,
          requested: options.count,
          createdCount: created.length,
          updatedCount: updated.length,
          tokensPath: options.tokensPath,
          outputPath: options.outputPath,
          created,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
