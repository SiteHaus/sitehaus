import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import stripeConfig from 'src/conf/stripe.config';
import { StripeService } from './stripe.service';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig)],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
