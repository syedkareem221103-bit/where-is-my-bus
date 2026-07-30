import prisma from '../../../config/database';
import { Notification, NotificationRecipient, NotificationDeliveryStatus, Prisma } from '@prisma/client';

export class NotificationRepository {
  async createNotification(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return prisma.notification.create({
      data
    });
  }

  async createRecipients(data: Prisma.NotificationRecipientCreateManyInput[]): Promise<void> {
    await prisma.notificationRecipient.createMany({
      data,
      skipDuplicates: true // for idempotency
    });
  }

  async updateRecipientStatus(
    id: string, 
    status: NotificationDeliveryStatus, 
    updates: Partial<NotificationRecipient> = {}
  ): Promise<NotificationRecipient> {
    const data: Prisma.NotificationRecipientUpdateInput = {
      status,
      ...updates
    };

    switch (status) {
      case NotificationDeliveryStatus.PROCESSING:
        data.processingAt = new Date();
        break;
      case NotificationDeliveryStatus.SENT:
        data.sentAt = new Date();
        break;
      case NotificationDeliveryStatus.DELIVERED:
        data.deliveredAt = new Date();
        break;
      case NotificationDeliveryStatus.FAILED:
        data.failedAt = new Date();
        break;
      case NotificationDeliveryStatus.EXPIRED:
        data.expiredAt = new Date();
        break;
      case NotificationDeliveryStatus.READ:
        data.readAt = new Date();
        break;
    }

    return prisma.notificationRecipient.update({
      where: { id },
      data
    });
  }
}
