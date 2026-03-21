import { makeApp } from './app';

async function bootstrap() {
  const app = await makeApp();

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
