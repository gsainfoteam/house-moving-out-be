import {
  defineAccount,
  prismaSessionStore,
  type UserInfo,
} from '@gsainfoteam/account-nest';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@lib/database';
import ms, { StringValue } from 'ms';
import { AuthService } from './auth.service';

const requiredScopes = ['name', 'email', 'student_id', 'phone_number'] as const;

export const account = defineAccount({ requiredScopes, session: {} });
export const { AccountModule, AccountService } = account;
export type AccountService = InstanceType<typeof AccountService>;
export type IdpUser = UserInfo<(typeof requiredScopes)[number]>;

const seconds = (value: StringValue) => Math.floor(ms(value) / 1000);

export const accountOptions = (
  config: ConfigService,
  authService: AuthService,
  db: DatabaseService,
) => ({
  issuer: 'production',
  clientId: config.getOrThrow<string>('ACCOUNT_CLIENT_ID'),
  clientSecret: config.getOrThrow<string>('ACCOUNT_CLIENT_SECRET'),
  session: {
    secret: config.getOrThrow<string>('SESSION_SECRET'),
    store: {
      ...prismaSessionStore(db.accountSession),
      // 없으면 로그아웃한 세션의 access token 이 만료될 때까지 계속 통과한다
      isActive: async (sessionId: string) =>
        (await db.accountSession.count({ where: { sessionId } })) > 0,
    },
    onLogin: 'replace' as const,
    accessTtl: seconds(config.getOrThrow<StringValue>('USER_JWT_EXPIRE')),
    refreshTtl: seconds(
      config.getOrThrow<StringValue>('USER_REFRESH_TOKEN_EXPIRE'),
    ),
    resolve: (user: IdpUser, { body }: { body: Record<string, unknown> }) =>
      authService.resolveSession(user, body),
  },
});
