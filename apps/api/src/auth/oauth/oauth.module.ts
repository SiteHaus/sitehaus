import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { DbModule } from 'src/db/db.module';
import { RolesModule } from 'src/roles/roles.module';
import { SessionModule } from 'src/session/session.module';
import { UsersModule } from 'src/users/users.module';
import { AuthCodeModule } from '../auth-code/auth-code.module';
import { AuthModule } from '../auth.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    DbModule,
    ClientsModule,
    RolesModule,
    UsersModule,
    SessionModule,
    AuthCodeModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
