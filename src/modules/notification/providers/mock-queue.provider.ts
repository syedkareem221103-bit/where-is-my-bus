import { IQueueProvider, IQueueJob } from './queue.provider.interface';
import { randomUUID } from 'crypto';
import logger from '../../../utils/logger';

export class MockQueueProvider implements IQueueProvider {
  private queues: Record<string, IQueueJob[]> = {};
  private handlers: Record<string, (job: IQueueJob) => Promise<void>> = {};
  
  // Track metrics
  public metrics = {
    processed: 0,
    failed: 0
  };

  async enqueue<T>(queueName: string, data: T, options?: { priority?: number; delay?: number; idempotencyKey?: string }): Promise<string> {
    const job: IQueueJob<T> = {
      id: randomUUID(),
      data,
      priority: options?.priority,
      delay: options?.delay
    };

    if (!this.queues[queueName]) {
      this.queues[queueName] = [];
    }

    this.queues[queueName].push(job);
    logger.debug(`[MockQueue] Enqueued job ${job.id} to ${queueName} with priority ${options?.priority}`);

    setTimeout(() => {
      this.processNext(queueName);
    }, options?.delay || 0);

    return job.id;
  }

  process<T>(queueName: string, handler: (job: IQueueJob<T>) => Promise<void>): void {
    this.handlers[queueName] = handler as (job: IQueueJob) => Promise<void>;
    this.processNext(queueName);
  }

  async getQueueDepth(queueName: string): Promise<number> {
    return this.queues[queueName]?.length || 0;
  }

  private async processNext(queueName: string) {
    const handler = this.handlers[queueName];
    if (!handler) return;

    const queue = this.queues[queueName];
    if (!queue || queue.length === 0) return;

    // Higher priority number = process first
    queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const job = queue.shift();
    if (job) {
      try {
        await handler(job);
        this.metrics.processed++;
      } catch (err) {
        logger.error(`[MockQueue] Job ${job.id} failed in queue ${queueName}:`, err);
        this.metrics.failed++;
        // We can add it back for retry if needed, but for mock we keep it simple
      }
    }

    if (queue.length > 0) {
      setTimeout(() => this.processNext(queueName), 0);
    }
  }
}
