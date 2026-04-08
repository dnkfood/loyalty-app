import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PushService, type SendPushOptions } from './push.service';

export const PUSH_QUEUE_NAME = 'push-notifications';

export interface CampaignPushJobData {
  userId: string;
  title: string;
  body: string;
  campaignId: string;
}

type PushJobData =
  | { type: 'template'; payload: SendPushOptions }
  | { type: 'campaign'; payload: CampaignPushJobData };

@Injectable()
export class PushQueue {
  private readonly logger = new Logger(PushQueue.name);
  private readonly queue: Queue<PushJobData>;
  private worker: Worker<PushJobData> | undefined;

  constructor(
    private readonly pushService: PushService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const [host, portStr] = redisUrl.replace('redis://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    this.queue = new Queue<PushJobData>(PUSH_QUEUE_NAME, {
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
    this.worker = new Worker<PushJobData>(
      PUSH_QUEUE_NAME,
      async (job: Job<PushJobData>) => {
        this.logger.debug(`Processing push job ${job.id}`);
        const { type, payload } = job.data;
        if (type === 'campaign') {
          const { userId, title, body, campaignId } = payload as CampaignPushJobData;
          await this.pushService.sendRawToUser(userId, title, body, undefined, campaignId);
        } else {
          await this.pushService.sendToUser(payload as SendPushOptions);
        }
      },
      { connection: { host, port } },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Push job ${job?.id} failed: ${err.message}`);
    });
  }

  async enqueue(options: SendPushOptions): Promise<void> {
    await this.queue.add('send-push', { type: 'template', payload: options });
  }

  async enqueueCampaignPush(data: CampaignPushJobData): Promise<void> {
    await this.queue.add('campaign-push', { type: 'campaign', payload: data });
  }
}
