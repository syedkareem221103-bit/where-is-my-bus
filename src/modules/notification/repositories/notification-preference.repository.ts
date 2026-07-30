import prisma from '../../../config/database';
import { UserNotificationPreference } from '@prisma/client';

export class NotificationPreferenceRepository {
  async getByUserId(organizationId: string, userId: string): Promise<UserNotificationPreference | null> {
    return prisma.userNotificationPreference.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      }
    });
  }

  async upsert(organizationId: string, userId: string, data: Partial<UserNotificationPreference>): Promise<UserNotificationPreference> {
    return prisma.userNotificationPreference.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      },
      create: {
        organizationId,
        userId,
        smsEnabled: data.smsEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        emailEnabled: data.emailEnabled ?? false,
        inAppEnabled: data.inAppEnabled ?? true,
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
        emergencyOverride: data.emergencyOverride ?? true,
        language: data.language ?? 'en',
        timezone: data.timezone ?? 'UTC'
      },
      update: data
    });
  }
}
