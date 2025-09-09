import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import emailConfig from 'src/conf/email.config';
import { EmailService } from './email.service';
import { SESV2 } from './email.tokens';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SESV2,
      inject: [emailConfig.KEY],
      useFactory: (cfg: ConfigType<typeof emailConfig>) =>
        new SESv2Client({ region: cfg.region }),
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
