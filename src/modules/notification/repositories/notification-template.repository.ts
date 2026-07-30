import prisma from '../../../config/database';
import { NotificationTemplate } from '@prisma/client';

export class NotificationTemplateRepository {
  async getTemplate(organizationId: string, eventKey: string, channel: string, language: string = 'en'): Promise<NotificationTemplate | null> {
    // Try to find the active template for the specific language
    let template = await prisma.notificationTemplate.findFirst({
      where: {
        organizationId,
        eventKey,
        channel,
        language,
        isActive: true
      },
      orderBy: {
        version: 'desc'
      }
    });

    // Fallback to English if not found in requested language
    if (!template && language !== 'en') {
      template = await prisma.notificationTemplate.findFirst({
        where: {
          organizationId,
          eventKey,
          channel,
          language: 'en',
          isActive: true
        },
        orderBy: {
          version: 'desc'
        }
      });
    }

    return template;
  }
}
