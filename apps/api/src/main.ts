import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './http/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-client-key',
      'x-client-id',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Retry-After'],
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  await app.listen(process.env.PORT ?? 3003);
}

bootstrap();
