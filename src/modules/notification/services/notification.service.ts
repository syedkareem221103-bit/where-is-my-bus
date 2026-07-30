import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPreferenceService } from './notification-preference.service';
import { IQueueProvider } from '../providers/queue.provider.interface';
import { randomUUID } from 'crypto';
import logger from '../../../utils/logger';

export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository,
    private prefService: NotificationPreferenceService,
    private queueProvider: IQueueProvider
  ) {}

  /**
   * Main entry point when a Domain Event occurs.
   * This fans out the notification to multiple recipients.
   */
  async dispatch(
    organizationId: string,
    eventKey: string,
    priority: string,
    payload: Record<string, any>,
    recipientIds: string[],
    tripId?: string,
    expiresInMs?: number
  ): Promise<void> {
    const correlationId = payload.correlationId || randomUUID();
    const isEmergency = priority === 'EMERGENCY';

    // 1. Create the core Notification record
    const notification = await this.notificationRepo.createNotification({
      organizationId,
      correlationId,
      tripId,
      eventKey,
      priority,
      payload,
      expiresAt: expiresInMs ? new Date(Date.now() + expiresInMs) : undefined
    });

    const channels = ['IN_APP', 'EMAIL', 'SMS', 'PUSH'];
    const recipientsData: any[] = [];
    const jobsToQueue: any[] = [];

    // 2. Evaluate preferences for each recipient and each channel
    for (const userId of recipientIds) {
      const pref = await this.prefService.getPreferences(organizationId, userId);

      for (const channel of channels) {
        const shouldSend = this.prefService.shouldSend(pref, channel, isEmergency);
        
        if (shouldSend) {
          const idempotencyKey = `${notification.id}-${userId}-${channel}`;
          const recipientId = randomUUID();
          
          recipientsData.push({
            id: recipientId,
            organizationId,
            notificationId: notification.id,
            userId,
            channel,
            idempotencyKey
          });

          // Prepare job payload for the queue
          jobsToQueue.push({
            queueName: priority,
            data: {
              recipientRecordId: recipientId,
              organizationId,
              userId,
              channel,
              eventKey,
              language: pref?.language || 'en',
              payload
            },
            priority: this.getQueuePriorityLevel(priority)
          });
        }
      }
    }

    // 3. Bulk insert recipients
    if (recipientsData.length > 0) {
      await this.notificationRepo.createRecipients(recipientsData);

      // 4. Enqueue fan-out jobs
      for (const job of jobsToQueue) {
        await this.queueProvider.enqueue(job.queueName, job.data, {
          priority: job.priority,
          idempotencyKey: job.data.recipientRecordId
        });
      }
      
      logger.info(`[NotificationService] Dispatched ${jobsToQueue.length} notification jobs for event ${eventKey} (CorrelationID: ${correlationId})`);
    } else {
      logger.info(`[NotificationService] No eligible recipients for event ${eventKey} (CorrelationID: ${correlationId})`);
    }
  }

  private getQueuePriorityLevel(priority: string): number {
    switch (priority) {
      case 'EMERGENCY': return 100;
      case 'HIGH': return 75;
      case 'NORMAL': return 50;
      case 'LOW': return 25;
      default: return 50;
    }
  }
}
