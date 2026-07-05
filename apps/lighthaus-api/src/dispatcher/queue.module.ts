import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { DispatcherService } from "./dispatcher.service";
import { NOTIFICATIONS_QUEUE, RESEND_CLIENT } from "./tokens";

export { NOTIFICATIONS_QUEUE } from "./tokens";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("lighthaus.redisUrl") },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    DispatcherService,
    {
      provide: RESEND_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Resend(config.get<string>("lighthaus.resendApiKey")),
    },
  ],
  exports: [DispatcherService],
})
export class QueueModule {}
