import { IQueueProvider, IQueueJob } from './queue.provider.interface';
import { randomUUID } from 'crypto';
import logger from '../../../utils/logger';
import Redis from 'ioredis';

export class RedisQueueProvider implements IQueueProvider {
  private redis: Redis;
  private isProcessing = false;
  private workers: Promise<void>[] = [];
  private readonly MAX_RETRIES = 3;
  
  constructor() {
    if (process.env.NODE_ENV === 'test') {
      const RedisMock = require('ioredis-mock');
      this.redis = new RedisMock();
    } else {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
  }

  async enqueue<T>(queueName: string, data: T, options?: { priority?: number; delay?: number; idempotencyKey?: string }): Promise<string> {
    const job: IQueueJob<T> = {
      id: randomUUID(),
      data,
      priority: options?.priority,
      delay: options?.delay,
      retryCount: 0
    };

    await this.redis.lpush(`queue:${queueName}`, JSON.stringify(job));
    logger.debug(`[RedisQueue] Enqueued job ${job.id} to ${queueName}`);
    return job.id;
  }

  process<T>(queueName: string, handler: (job: IQueueJob<T>) => Promise<void>): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
    }
    const worker = this.startPolling(queueName, handler);
    this.workers.push(worker);
  }

  private async startPolling<T>(queueName: string, handler: (job: IQueueJob<T>) => Promise<void>) {
    while (this.isProcessing) {
      try {
        const jobString = await this.redis.lpop(`queue:${queueName}`);
        if (jobString) {
          const job: IQueueJob<T> = JSON.parse(jobString);
          try {
            await handler(job);
          } catch (err) {
            job.retryCount = (job.retryCount || 0) + 1;
            logger.error(`[RedisQueue] Job ${job.id} failed in queue ${queueName} (Attempt ${job.retryCount}/${this.MAX_RETRIES}):`, err);
            
            if (job.retryCount < this.MAX_RETRIES) {
              await this.redis.lpush(`queue:${queueName}`, JSON.stringify(job));
            } else {
              logger.error(`[RedisQueue] Job ${job.id} exhausted retries in queue ${queueName}`);
            }
          }
        } else {
          // If queue is empty, wait 500ms before polling again
          await new Promise(res => setTimeout(res, 500));
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('Connection is closed')) {
          logger.error(`[RedisQueue] Polling error on ${queueName}:`, err);
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
  }

  async getQueueDepth(queueName: string): Promise<number> {
    return this.redis.llen(`queue:${queueName}`);
  }

  async shutdown(): Promise<void> {
    this.isProcessing = false;
    this.redis.disconnect();
    await Promise.all(this.workers);
  }
}
