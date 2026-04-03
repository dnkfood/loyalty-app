import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { maskPhone } from '@loyalty/shared-utils';

export const SMS_QUEUE_NAME = 'sms-notifications';

export interface SmsJobData {
  phone: string;
  code: string;
}

@Injectable()
export class SmsQueue {
  private readonly logger = new Logger(SmsQueue.name);
  private readonly queue: Queue<SmsJobData>;
  private worker: Worker<SmsJobData> | undefined;

  constructor(
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const [host, portStr] = redisUrl.replace('redis://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    this.queue = new Queue<SmsJobData>(SMS_QUEUE_NAME, {
      connection: { host: host ?? 'localhost', port },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    this.initWorker(host ?? 'localhost', port);
  }

  private initWorker(host: string, port: number): void {
    this.worker = new Worker<SmsJobData>(
      SMS_QUEUE_NAME,
      async (job: Job<SmsJobData>) => {
        this.logger.debug(`Processing SMS job ${job.id} for ${maskPhone(job.data.phone)}`);
        const result = await this.smsService.sendOtp(job.data.phone, job.data.code);
        if (!result.success) {
          throw new Error(`SMS send failed: ${result.error ?? 'unknown'}`);
        }
      },
      { connection: { host, port } },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`SMS job ${job?.id} failed: ${err.message}`);
    });
  }

  async enqueue(phone: string, code: string): Promise<void> {
    await this.queue.add('send-sms', { phone, code });
  }
}
