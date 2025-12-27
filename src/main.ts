import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('House Moving Out API')
    .setDescription(
      'Backend API for House Moving Out\n[GitHub](https://github.com/gsainfoteam/house-moving-out-be)',
    )
    .setVersion('1.0')
    .addTag('House Moving Out')
    .addOAuth2(
      {
        type: 'oauth2',
        scheme: 'bearer',
        name: 'idp-token',
        in: 'header',
        bearerFormat: 'token',
        flows: {
          authorizationCode: {
            authorizationUrl:
              configService.getOrThrow<string>('SWAGGER_AUTH_URL'),
            tokenUrl: configService.getOrThrow<string>('SWAGGER_TOKEN_URL'),
            scopes: {
              openid: 'openid',
              email: 'email',
              profile: ' profile',
            },
          },
        },
      },
      'oauth2',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        name: 'JWT',
        in: 'header',
      },
      'admin',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        name: 'JWT',
        in: 'header',
      },
      'jwt',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      displayRequestDuration: true,
      oauth2RedirectUrl: `${configService.get<string>('API_URL')}/api/oauth2-redirect.html`,
      initOAuth: {
        usePkceWithAuthorizationCodeGrant: true,
        additionalQueryStringParams: { nonce: 'help' },
      },
    },
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
