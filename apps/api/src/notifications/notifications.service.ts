import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { NotificationJobData } from './notifications.types';

export const NOTIFICATIONS_QUEUE = 'notifications';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotificationJobData>,
  ) {}

  async enqueue(job: NotificationJobData): Promise<void> {
    await this.queue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }
}
