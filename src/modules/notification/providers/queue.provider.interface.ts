export interface IQueueJob<T = any> {
  id: string;
  data: T;
  priority?: number;
  delay?: number;
  retryCount?: number;
}

export interface IQueueProvider {
  /**
   * Enqueue a job to a specific queue
   * @param queueName 
   * @param data 
   * @param options 
   */
  enqueue<T>(queueName: string, data: T, options?: { priority?: number; delay?: number; idempotencyKey?: string }): Promise<string>;
  
  /**
   * Register a worker for a queue
   */
  process<T>(queueName: string, handler: (job: IQueueJob<T>) => Promise<void>): void;

  /**
   * Get queue depth
   */
  getQueueDepth(queueName: string): Promise<number>;

  /**
   * Gracefully stop accepting new jobs and wait for pending jobs
   */
  shutdown?(): Promise<void>;
}
