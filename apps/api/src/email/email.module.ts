import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { Resend } from 'resend';
import emailConfig from 'src/conf/email.config';
import { EmailService } from './email.service';
import { RESEND } from './email.tokens';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RESEND,
      inject: [emailConfig.KEY],
      useFactory: (cfg: ConfigType<typeof emailConfig>) => {
        return new Resend(cfg.resendApiKey);
      },
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
