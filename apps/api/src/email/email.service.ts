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
import { Resend } from 'resend';
import { RESEND } from './email.tokens';

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);

  constructor(
    @Inject(RESEND) private readonly resend: Resend,
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
    tags?: Record<string, string>;
  }): Promise<{ messageId: string }> {
    const to = toArray(opts.to)!;
    const textFallback = opts.text ?? htmlToText(opts.html);

    const replyTo = toArray(opts.replyTo);

    const tags =
      opts.tags &&
      Object.entries(opts.tags).map(([name, value]) => ({ name, value }));

    const from = opts.from ?? this.cfg.from;

    const result = await this.resend.emails.send({
      from,
      to,
      subject: opts.subject,
      html: opts.html,
      text: textFallback,
      replyTo: replyTo && replyTo.length > 0 ? replyTo : undefined,
      tags,
    });

    const messageId = result?.data?.id ?? '';

    if (result.error) {
      this.log.error(
        `Resend send error --> ${to.join(', ')}: ${result.error.message}`,
        result.error,
      );

      throw result.error;
    }

    this.log.log(`Resend send ok: ${messageId} --> ${to.join(', ')}`);
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
