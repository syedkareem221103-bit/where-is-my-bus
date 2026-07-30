import { IQueueProvider, IQueueJob } from '../providers/queue.provider.interface';
import { IEmailProvider, ISmsProvider, IPushProvider, IInAppProvider } from '../providers/channel.provider.interfaces';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDeliveryStatus } from '@prisma/client';
import logger from '../../../utils/logger';

export class NotificationDispatcher {
  constructor(
    private queueProvider: IQueueProvider,
    private templateService: NotificationTemplateService,
    private notificationRepo: NotificationRepository,
    private emailProvider: IEmailProvider,
    private smsProvider: ISmsProvider,
    private pushProvider: IPushProvider,
    private inAppProvider: IInAppProvider
  ) {}

  public startWorkers() {
    const queues = ['EMERGENCY', 'HIGH', 'NORMAL', 'LOW'];
    
    queues.forEach(queueName => {
      this.queueProvider.process(queueName, async (job) => {
        await this.processJob(job);
      });
      logger.info(`[NotificationDispatcher] Started worker for queue: ${queueName}`);
    });
  }

  private async processJob(job: IQueueJob): Promise<void> {
    const { recipientRecordId, organizationId, userId, channel, eventKey, language, payload } = job.data;
    
    try {
      // 1. Mark as processing
      await this.notificationRepo.updateRecipientStatus(recipientRecordId, NotificationDeliveryStatus.PROCESSING);

      // 2. Compile template
      const { subject, body } = await this.templateService.compile(
        organizationId,
        eventKey,
        channel,
        language,
        payload
      );

      // 3. Send via appropriate channel provider
      let success = false;
      
      switch (channel) {
        case 'EMAIL':
          // Assume payload has an email field, or we would fetch it here.
          // For now, we expect email in payload or we fallback to dummy
          const email = payload.userEmail || 'test@example.com'; 
          success = await this.emailProvider.sendEmail(email, subject || 'Notification', body);
          break;
        case 'SMS':
          const phone = payload.userPhone || '+1234567890';
          success = await this.smsProvider.sendSms(phone, body);
          break;
        case 'PUSH':
          const token = payload.deviceToken || 'dummy_token';
          success = await this.pushProvider.sendPush(token, subject || 'Alert', body, payload);
          break;
        case 'IN_APP':
          success = await this.inAppProvider.sendInApp(userId, { subject, body, payload });
          break;
        default:
          logger.warn(`[NotificationDispatcher] Unknown channel ${channel}`);
      }

      // 4. Update status
      if (success) {
        await this.notificationRepo.updateRecipientStatus(recipientRecordId, 
          channel === 'IN_APP' ? NotificationDeliveryStatus.DELIVERED : NotificationDeliveryStatus.SENT
        );
      } else {
        throw new Error('Provider returned false');
      }

    } catch (err: any) {
      logger.error(`[NotificationDispatcher] Job ${job.id} failed:`, err);
      await this.notificationRepo.updateRecipientStatus(recipientRecordId, NotificationDeliveryStatus.FAILED, {
        errorMessage: err.message || 'Unknown error'
      });
      // A robust worker would throw here to trigger queue retry mechanisms
      throw err; 
    }
  }
}
