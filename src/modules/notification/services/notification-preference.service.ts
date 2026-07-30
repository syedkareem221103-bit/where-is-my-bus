import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { UserNotificationPreference } from '@prisma/client';

export class NotificationPreferenceService {
  private repo: NotificationPreferenceRepository;
  
  // In-memory cache for preferences: Key -> 'orgId:userId', Value -> { data, expiresAt }
  private cache: Map<string, { data: UserNotificationPreference; expiresAt: number }> = new Map();
  private CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

  constructor(repo?: NotificationPreferenceRepository) {
    this.repo = repo || new NotificationPreferenceRepository();
  }

  async getPreferences(organizationId: string, userId: string): Promise<UserNotificationPreference | null> {
    const cacheKey = `${organizationId}:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const pref = await this.repo.getByUserId(organizationId, userId);
    
    if (pref) {
      this.cache.set(cacheKey, {
        data: pref,
        expiresAt: Date.now() + this.CACHE_TTL_MS
      });
    }

    return pref;
  }

  async getManyPreferences(organizationId: string, userIds: string[]): Promise<Map<string, UserNotificationPreference | null>> {
    const result = new Map<string, UserNotificationPreference | null>();
    const missingIds: string[] = [];
    const now = Date.now();

    // 1. Check cache first
    for (const id of userIds) {
      const cacheKey = `${organizationId}:${id}`;
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        result.set(id, cached.data);
      } else {
        missingIds.push(id);
      }
    }

    // 2. Bulk fetch missing from DB
    if (missingIds.length > 0) {
      const fetched = await this.repo.getManyByUserIds(organizationId, missingIds);
      const fetchedMap = new Map(fetched.map(p => [p.userId, p]));

      for (const id of missingIds) {
        const pref = fetchedMap.get(id) || null;
        result.set(id, pref);
        
        if (pref) {
          this.cache.set(`${organizationId}:${id}`, {
            data: pref,
            expiresAt: now + this.CACHE_TTL_MS
          });
        }
      }
    }

    return result;
  }

  async updatePreferences(organizationId: string, userId: string, data: Partial<UserNotificationPreference>): Promise<UserNotificationPreference> {
    const updated = await this.repo.upsert(organizationId, userId, data);
    
    // Invalidate and update cache
    const cacheKey = `${organizationId}:${userId}`;
    this.cache.set(cacheKey, {
      data: updated,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return updated;
  }

  invalidateCache(organizationId: string, userId: string): void {
    this.cache.delete(`${organizationId}:${userId}`);
  }

  /**
   * Evaluates if a notification should be suppressed due to quiet hours, unless it's an emergency.
   */
  isQuietHours(pref: UserNotificationPreference, currentTime: Date = new Date()): boolean {
    if (!pref.quietHoursStart || !pref.quietHoursEnd) {
      return false;
    }

    // Convert currentTime to user's timezone? For simplicity, assuming server time logic or parse 'HH:mm'
    const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
    const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);

    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    const currentMinutes = currentH * 60 + currentM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Crosses midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  shouldSend(pref: UserNotificationPreference | null, channel: string, isEmergency: boolean): boolean {
    // If no preference found, fallback to defaults (true for inApp/push/sms, false for email)
    if (!pref) {
      return channel !== 'EMAIL';
    }

    // Emergency override
    if (isEmergency && pref.emergencyOverride) {
      return true;
    }

    // Check channel enabled
    let channelEnabled = false;
    switch (channel) {
      case 'IN_APP': channelEnabled = pref.inAppEnabled; break;
      case 'EMAIL': channelEnabled = pref.emailEnabled; break;
      case 'SMS': channelEnabled = pref.smsEnabled; break;
      case 'PUSH': channelEnabled = pref.pushEnabled; break;
    }

    if (!channelEnabled) {
      return false;
    }

    // Check quiet hours
    if (this.isQuietHours(pref)) {
      return false; // Suppressed due to quiet hours
    }

    return true;
  }
}
