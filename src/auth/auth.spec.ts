import {
  createFakeIdp,
  fakeUser,
  type FakeIdp,
  type FakeUser,
} from '@gsainfoteam/account-testing';
import { memorySessionStore } from '@gsainfoteam/account-nest';
import { HttpService } from '@nestjs/axios';
import {
  Controller,
  Get,
  INestApplication,
  Module,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  DatabaseService,
  UserConsentRepository,
  UserRepository,
} from '@lib/database';
import { ConsentType, Role, User } from 'generated/prisma/client';
import { of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AccountModule, accountOptions } from './account';
import { AuthService } from './auth.service';
import { GetUser } from './decorator/get-user.decorator';
import { AdminGuard } from './guard/admin.guard';
import { UserGuard } from './guard/user.guard';

const CLIENT_ID = 'house-moving-out';
const POLICY = { service: 'house', tos: '260301', privacy: '260302' };

@Controller()
class ProbeController {
  @Get('me')
  @UseGuards(UserGuard)
  me(@GetUser() user: User) {
    return { uuid: user.uuid };
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  admin() {
    return {};
  }
}

let idp: FakeIdp;
let app: INestApplication<App>;
let users: Map<string, User>;
let consents: { userUuid: string; consentType: ConsentType; version: string }[];

// 서비스 DB 대신 학번으로 사용자를 찾는 upsert 동작만 흉내 낸다
const userRepository = {
  upsertUserInTx: jest.fn(
    (info: Pick<User, 'name' | 'studentNumber'>): Promise<User> => {
      const user = users.get(info.studentNumber) ?? {
        ...info,
        uuid: `user-${users.size + 1}`,
        role: Role.USER,
      };
      users.set(info.studentNumber, user as User);
      return Promise.resolve(user as User);
    },
  ),
  findUser: jest.fn((uuid: string) =>
    Promise.resolve([...users.values()].find((user) => user.uuid === uuid)),
  ),
};

const userConsentRepository = {
  getLatestUserConsentInTx: jest.fn((userUuid: string, type: ConsentType) =>
    Promise.resolve(
      consents.findLast(
        (c) => c.userUuid === userUuid && c.consentType === type,
      ) ?? null,
    ),
  ),
  createUserConsentsInTx: jest.fn(
    (
      userUuid: string,
      created: { consentType: ConsentType; version: string }[],
    ) => {
      consents.push(...created.map((c) => ({ ...c, userUuid })));
      return Promise.resolve();
    },
  ),
};

@Module({
  providers: [
    AuthService,
    {
      provide: ConfigService,
      useValue: new ConfigService({
        ACCOUNT_CLIENT_ID: CLIENT_ID,
        ACCOUNT_CLIENT_SECRET: 'secret',
        SESSION_SECRET: 'a-test-session-secret-that-is-long-enough',
        USER_JWT_EXPIRE: '15m',
        USER_REFRESH_TOKEN_EXPIRE: '30d',
        POLICY_API_URL: 'https://policy.test',
        SERVICE_NAME_FOR_POLICY_VERSION: POLICY.service,
      }),
    },
    {
      provide: HttpService,
      useValue: { get: () => of({ data: POLICY }) },
    },
    {
      provide: DatabaseService,
      useValue: {
        $transaction: (run: (tx: unknown) => unknown) => run({}),
        accountSession: {},
      },
    },
    { provide: UserRepository, useValue: userRepository },
    { provide: UserConsentRepository, useValue: userConsentRepository },
  ],
  exports: [AuthService, ConfigService, DatabaseService, UserRepository],
})
class FakeDepsModule {}

beforeAll(async () => {
  idp = await createFakeIdp({
    clients: [
      {
        clientId: CLIENT_ID,
        clientSecret: 'secret',
        scopes: ['name', 'email', 'student_id', 'phone_number'],
        tokenEndpointAuthMethod: 'client_secret_post',
      },
    ],
  });
  jest.spyOn(globalThis, 'fetch').mockImplementation(idp.fetch);

  const moduleRef = await Test.createTestingModule({
    imports: [
      FakeDepsModule,
      AccountModule.forRootAsync({
        isGlobal: true,
        imports: [FakeDepsModule],
        inject: [ConfigService, AuthService, DatabaseService],
        useFactory: (
          config: ConfigService,
          auth: AuthService,
          db: DatabaseService,
        ) => {
          const options = accountOptions(config, auth, db);
          return {
            ...options,
            session: { ...options.session, store: memorySessionStore() },
          };
        },
      }),
    ],
    controllers: [ProbeController],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  // app.ts 와 같은 전역 pipe 가 SDK 의 로그인 body 를 건드리지 않는지 함께 본다
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  users = new Map();
  consents = [];
});

type LoginResponse = {
  access_token: string;
  ticket: string;
  details: { errorCode: string };
};

async function sendLogin(body: object) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ ...body, transport: 'body' });
  return { status: res.status, body: res.body as LoginResponse };
}

async function postLogin(user: FakeUser, body: object = {}) {
  const { body: code } = await idp.authorize({ clientId: CLIENT_ID, user });
  return sendLogin({ ...code, ...body });
}

const agreement = {
  agreedToTerms: true,
  agreedToPrivacy: true,
  termsVersion: POLICY.tos,
  privacyVersion: POLICY.privacy,
};

describe('consent before login', () => {
  it('rejects a first login with the old consent body as details, then accepts the retry', async () => {
    const rejected = await postLogin(fakeUser({ student_id: '20250001' }));

    expect(rejected.status).toBe(403);
    expect(rejected.body).toMatchObject({
      error: 'session_rejected',
      ticket: expect.any(String) as unknown,
      details: {
        errorCode: 'CONSENT_REQUIRED',
        statusCode: 403,
        requiredConsents: {
          terms: { requiredVersion: POLICY.tos },
          privacy: { requiredVersion: POLICY.privacy },
        },
      },
    });

    const retried = await sendLogin({
      ticket: rejected.body.ticket,
      ...agreement,
    });

    expect(retried.status).toBe(200);
    expect(consents.map((c) => [c.consentType, c.version])).toEqual([
      [ConsentType.TERMS_OF_SERVICE, POLICY.tos],
      [ConsentType.PRIVACY_POLICY, POLICY.privacy],
    ]);

    await request(app.getHttpServer())
      .get('/me')
      .set('authorization', `Bearer ${retried.body.access_token}`)
      .expect(200, { uuid: 'user-1' });
  });

  it('asks again when the policy version changed', async () => {
    const user = fakeUser({ student_id: '20250002' });
    await postLogin(user, agreement);
    consents[0].version = 'old';

    const rejected = await postLogin(user);

    expect(rejected.status).toBe(403);
    expect(rejected.body.details.errorCode).toBe('CONSENT_UPDATE_REQUIRED');
  });

  it('logs a returning user in without asking', async () => {
    const user = fakeUser({ student_id: '20250003' });
    await postLogin(user, agreement);

    const again = await postLogin(user);

    expect(again.status).toBe(200);
    expect(users.size).toBe(1);
  });

  it('answers 400 to a malformed consent body', async () => {
    const res = await postLogin(fakeUser(), { agreedToTerms: 'yes' });

    expect(res.status).toBe(400);
  });
});

it('turns away a user whose phone number is not verified', async () => {
  const res = await postLogin(fakeUser({ is_phone_number_verified: false }));

  expect(res.status).toBe(401);
  expect(users.size).toBe(0);
});

describe('guards', () => {
  it('needs a session', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('ends the earlier session when the same user logs in again', async () => {
    const user = fakeUser();
    const first = await postLogin(user, agreement);
    await postLogin(user, agreement);

    await request(app.getHttpServer())
      .get('/me')
      .set('authorization', `Bearer ${first.body.access_token}`)
      .expect(401);
  });

  it('keeps users out of admin routes', async () => {
    const { body } = await postLogin(fakeUser(), agreement);

    await request(app.getHttpServer())
      .get('/admin')
      .set('authorization', `Bearer ${body.access_token}`)
      .expect(403);
  });
});
