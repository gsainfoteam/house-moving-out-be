import serverlessExpress from '@codegenie/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { RequestListener } from 'http';
import { makeApp } from './app';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  const app = await makeApp();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as RequestListener;
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
): Promise<void> => {
  cachedServer = cachedServer ?? (await bootstrapServer());
  return cachedServer(event, context, callback);
};
