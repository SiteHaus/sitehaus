import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientGuard } from 'src/clients/client.guard';
import authConfig from 'src/conf/auth.config';
import { DbModule } from 'src/db/db.module';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { AccessGuard } from './access/access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto/crypto.service';
import { PasswordController } from './password/password.controller';
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
    AccessGuard,
    { provide: APP_GUARD, useClass: ClientGuard },
    { provide: APP_GUARD, useExisting: AccessGuard },
  ],
  controllers: [AuthController, PasswordController],
  exports: [JwtModule, TokenService, AuthService],
})
export class AuthModule {}
