import serverlessExpress from '@codegenie/serverless-express';
import type { Context } from 'aws-lambda';
import { RequestListener } from 'http';
import { makeApp } from './app';

type Handler = (event: any, context: Context) => Promise<void>;

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  const app = await makeApp();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as RequestListener;
  // NOTE: Handler dropped support for callback after Node24
  return serverlessExpress({ app: expressApp }) as unknown as Handler;
}

export const handler: Handler = async (
  event: any,
  context: Context,
): Promise<void> => {
  cachedServer = cachedServer ?? (await bootstrapServer());
  return cachedServer(event, context);
};
