import {
  SendEmailCommand,
  SESv2Client,
  type SendEmailRequest,
} from '@aws-sdk/client-sesv2';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { htmlToText, toArray } from '@site-haus/utils/core/helpers';
import emailConfig from 'src/conf/email.config';

import { renderOTPCodeEmail } from '@site-haus/transactional';
import type { OTPCodeEmailProps } from '@site-haus/transactional/emails/OTPCode';
import {
  InviteEmailProps,
  renderInviteRoleEmail,
} from '@site-haus/transactional/render/invite';
import { SESV2 } from './email.tokens';

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);

  constructor(
    @Inject(SESV2) private readonly ses: SESv2Client,
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
    const to = toArray(opts.to)!;
    const textFallback = opts.text ?? htmlToText(opts.html);

    const params: SendEmailRequest = {
      FromEmailAddress: opts.from ?? this.cfg.from,
      Destination: { ToAddresses: to },
      ReplyToAddresses: toArray(opts.replyTo),
      ConfigurationSetName: opts.configurationSet ?? this.cfg.configSet,
      EmailTags: opts.tags
        ? Object.entries(opts.tags).map(([Name, Value]) => ({ Name, Value }))
        : undefined,
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
    this.log.log(`SES send ok: ${messageId} → ${to.join(', ')}`);
    return { messageId };
  }

  async sendOtpCodeEmail(to: string, props: OTPCodeEmailProps) {
    const { subject, html, text } = await renderOTPCodeEmail(props);
    return this.send({ to, subject, html, text });
  }

  async sendInviteCodeEmail(to: string, props: InviteEmailProps) {
    const { subject, html, text } = await renderInviteRoleEmail(props);
    return this.send({ to, subject, html, text });
  }
}
