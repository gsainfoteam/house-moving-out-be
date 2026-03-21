import serverlessExpress from '@codegenie/serverless-express';
import type { Context } from 'aws-lambda';
import { RequestListener } from 'http';
import { makeApp } from './app';
import axios from 'axios';

type Handler = (event: any, context: Context) => Promise<void>;

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  const app = await makeApp();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as RequestListener;
  // NOTE: Handler dropped support for callback after Node24
  return serverlessExpress({ app: expressApp }) as unknown as Handler;
}

async function getParameter(name: string) {
  const token = process.env.AWS_SESSION_TOKEN;
  if (!token) {
    console.info('AWS_SESSION_TOKEN is not set');
    return;
  }
  return await axios
    .get<{ Parameter: { Value: string } }>(
      'http://localhost:2773/systemsmanager/parameters/get',
      {
        params: { name, withDecryption: true },
        headers: { 'X-Aws-Parameters-Secrets-Token': token },
      },
    )
    .then((res) => res.data.Parameter.Value);
}

export const handler: Handler = async (
  event: any,
  context: Context,
): Promise<void> => {
  if (!cachedServer) {
    const config = Object.fromEntries(
      await Promise.all(
        ['DATABASE_URL', 'USER_JWT_SECRET', 'REFRESH_TOKEN_HMAC_SECRET'].map(
          async (param) => [param, await getParameter(`/moving-out/${param}`)],
        ),
      ),
    ) as Record<string, string>;
    process.env = { ...process.env, ...config };
    cachedServer = await bootstrapServer();
  }
  return cachedServer(event, context);
};
