import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import expressBasicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(
    ['/api', '/api-json'],
    expressBasicAuth({
      challenge: true,
      users: {
        [configService.getOrThrow<string>('SWAGGER_USER')]:
          configService.getOrThrow<string>('SWAGGER_PASSWORD'),
      },
    }),
  );

  app.use(cookieParser());

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
              email: 'email',
              student_id: 'student_id',
              phone_number: 'phone_number',
              profile: 'profile',
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
      'user',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      displayRequestDuration: true,
      oauth2RedirectUrl: `${configService.getOrThrow<string>('API_URL')}/api/oauth2-redirect.html`,
      initOAuth: {
        usePkceWithAuthorizationCodeGrant: true,
      },
    },
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
