import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PushService, type SendPushOptions } from './push.service';

export const PUSH_QUEUE_NAME = 'push-notifications';

@Injectable()
export class PushQueue {
  private readonly logger = new Logger(PushQueue.name);
  private readonly queue: Queue<SendPushOptions>;
  private worker: Worker<SendPushOptions> | undefined;

  constructor(
    private readonly pushService: PushService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const [host, portStr] = redisUrl.replace('redis://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    this.queue = new Queue<SendPushOptions>(PUSH_QUEUE_NAME, {
      connection: { host: host ?? 'localhost', port },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.initWorker(host ?? 'localhost', port);
  }

  private initWorker(host: string, port: number): void {
    this.worker = new Worker<SendPushOptions>(
      PUSH_QUEUE_NAME,
      async (job: Job<SendPushOptions>) => {
        this.logger.debug(`Processing push job ${job.id}`);
        await this.pushService.sendToUser(job.data);
      },
      { connection: { host, port } },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Push job ${job?.id} failed: ${err.message}`);
    });
  }

  async enqueue(options: SendPushOptions): Promise<void> {
    await this.queue.add('send-push', options);
  }
}
