import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientGuard } from 'src/clients/client.guard';
import { ClientsModule } from 'src/clients/clients.module';
import authConfig from 'src/conf/auth.config';
import { CryptoModule } from 'src/crypto/crypto.module';
import { DbModule } from 'src/db/db.module';
import { EmailModule } from 'src/email/email.module';
import { SessionModule } from 'src/session/session.module';
import { UsersService } from 'src/users/users.service';
import { AccessGuard } from './access/access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { PasswordController } from './password/password.controller';
import { TokenService } from './token/token.service';
import { VerifiedGuard } from './verified/verified.guard';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    EmailModule,
    ClientsModule,
    SessionModule,
    CryptoModule,
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
    UsersService,
    OtpService,
    AccessGuard,
    VerifiedGuard,
    { provide: APP_GUARD, useClass: ClientGuard },
    { provide: APP_GUARD, useExisting: AccessGuard },
    { provide: APP_GUARD, useClass: VerifiedGuard },
  ],
  controllers: [AuthController, PasswordController],
  exports: [JwtModule, TokenService, AuthService],
})
export class AuthModule {}
