import { SendEmailCommand, type SendEmailRequest } from '@aws-sdk/client-sesv2';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import emailConfig from 'src/conf/email.config';
import { SESV2 } from './email.module';

import type { OTPCodeEmailProps } from '@site-haus/transactional/emails/OTPCode';
import { renderOTPCodeEmail } from '@site-haus/transactional/render/otp';

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);

  constructor(
    @Inject(SESV2) private readonly ses: any,
    @Inject(emailConfig.KEY)
    private readonly cfg: ConfigType<typeof emailConfig>,
  ) {}

  async send(opts: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string | string[];
    configurationSet?: string;
    tags?: Record<string, string>;
  }): Promise<{ messageId: string }> {
    const to = Array.isArray(opts.to) ? opts.to : [opts.to];

    const textFallback =
      opts.text ??
      (opts.html
        ? opts.html
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '');

    const params: SendEmailRequest = {
      FromEmailAddress: opts.from ?? this.cfg.from,
      Destination: { ToAddresses: to },
      ReplyToAddresses:
        opts.replyTo != null
          ? Array.isArray(opts.replyTo)
            ? opts.replyTo
            : [opts.replyTo]
          : this.cfg.replyTo
            ? [this.cfg.replyTo]
            : undefined,
      ConfigurationSetName: opts.configurationSet ?? this.cfg.configurationSet,
      EmailTags:
        opts.tags &&
        Object.entries(opts.tags).map(([Name, Value]) => ({ Name, Value })),
      Content: {
        Simple: {
          Subject: { Data: opts.subject, Charset: 'UTF-8' },
          Body: {
            ...(opts.html
              ? { Html: { Data: opts.html, Charset: 'UTF-8' } }
              : {}),
            ...(textFallback
              ? { Text: { Data: textFallback, Charset: 'UTF-8' } }
              : {}),
          },
        },
      },
    };

    const out = await this.ses.send(new SendEmailCommand(params));
    const messageId = out?.MessageId ?? '';
    this.log.debug(`SES send ok: ${messageId} → ${to.join(', ')}`);
    return { messageId };
  }

  async sendOtpCode(to: string, props: OTPCodeEmailProps) {
    const { subject, html, text } = await renderOTPCodeEmail(props);
    return this.send({ to, subject, html, text });
  }
}
