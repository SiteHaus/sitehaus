import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ClientsOriginService } from './clients/clients-origin/clients-origin.service';
import { ApiExceptionFilter } from './http/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const http = app.getHttpAdapter();
  if (http.getType() === 'express') {
    http.getInstance().set('trust proxy', true);
  }

  app.use(
    helmet({
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
        },
      },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.use(cookieParser());

  const originsSvc = app.get(ClientsOriginService);
  const allowed = await originsSvc.getAllowedOrigins();

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
