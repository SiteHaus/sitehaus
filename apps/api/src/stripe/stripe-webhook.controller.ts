import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from 'src/public.decorator';
import { BillingService } from 'src/billing/billing.service';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    let event: ReturnType<typeof this.stripe.constructEvent>;
    try {
      event = this.stripe.constructEvent(rawBody, signature);
    } catch {
      this.logger.warn('Stripe webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.billing.handleWebhookEvent(event);
    return { received: true };
  }
}
