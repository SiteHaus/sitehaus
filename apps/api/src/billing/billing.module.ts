import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { StripeWebhookController } from 'src/stripe/stripe-webhook.controller';
import { BillingController } from './billing.controller';
import { BillingInternalController } from './billing-internal.controller';
import { BillingService } from './billing.service';
import { ServiceKeyGuard } from './service-key.guard';

@Module({
  imports: [DbModule, AuditModule, StripeModule, NotificationsModule],
  providers: [BillingService, ServiceKeyGuard],
  exports: [BillingService],
  controllers: [
    BillingController,
    BillingInternalController,
    StripeWebhookController,
  ],
})
export class BillingModule {}
