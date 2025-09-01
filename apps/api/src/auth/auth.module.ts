import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import authConfig from 'src/conf/auth.config';
import { DbModule } from 'src/db/db.module';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { AccessGuard } from './access/access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto/crypto.service';
import { TokenService } from './token/token.service';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [authConfig.KEY],
      useFactory: (auth: ConfigType<typeof authConfig>) => ({
        secret: auth.secret,
        signOptions: { algorithm: auth.alg },
        verifyOptions: { algorithms: [auth.alg] as const },
      }),
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    UsersService,
    CryptoService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  controllers: [AuthController],
  exports: [JwtModule, TokenService, AuthService],
})
export class AuthModule {}
