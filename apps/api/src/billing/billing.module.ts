import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { StripeWebhookController } from 'src/stripe/stripe-webhook.controller';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [DbModule, AuditModule, StripeModule, NotificationsModule],
  providers: [BillingService],
  exports: [BillingService],
  controllers: [BillingController, StripeWebhookController],
})
export class BillingModule {}
