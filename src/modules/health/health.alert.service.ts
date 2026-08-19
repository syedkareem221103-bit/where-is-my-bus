import Redis from 'ioredis';
import { HealthStatus, SystemHealthPayload } from './health.types';
import { notificationService } from '../notification/notification.module';
import logger from '../../utils/logger';

let redis: Redis;

if (process.env.NODE_ENV === 'test') {
  const RedisMock = require('ioredis-mock');
  redis = new RedisMock();
} else {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

import { prisma } from '../../config/database';


export class HealthAlertService {
  private static LAST_STATE_KEY = 'system:health:last_state';

  public static async evaluateStateTransition(currentPayload: SystemHealthPayload): Promise<void> {
    try {
      const lastStateStr = await redis.get(this.LAST_STATE_KEY);
      const lastState: HealthStatus = lastStateStr ? (lastStateStr as HealthStatus) : 'HEALTHY';
      const currentState = currentPayload.globalStatus;

      if (currentState !== lastState) {
        // State transition occurred
        await redis.set(this.LAST_STATE_KEY, currentState);

        if (currentState === 'CRITICAL' || currentState === 'OFFLINE' || currentState === 'DEGRADED') {
          await this.dispatchAlert(currentState, currentPayload);
        } else if (currentState === 'HEALTHY' && (lastState === 'CRITICAL' || lastState === 'OFFLINE')) {
          await this.dispatchAlert('HEALTHY', currentPayload, 'System has recovered and is now HEALTHY.');
        }
      }
    } catch (e) {
      logger.error('Failed to evaluate health state transition', { error: e });
    }
  }

  private static async dispatchAlert(status: HealthStatus, payload: SystemHealthPayload, customMessage?: string): Promise<void> {
    try {
      // Notify SUPER_ADMINs across all organizations (or a generic system org)
      // Since NotificationService requires an organizationId, we will fetch SUPER_ADMINs 
      // and group by their orgs or send it using a system default org.
      
      const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
      const adminIds = superAdmins.map(u => u.id);

      if (adminIds.length > 0) {
        // We use the first admin's orgId as the context, or a dummy system org.
        const orgId = superAdmins[0].organizationId; 
        
        await notificationService.dispatch(
          orgId,
          'system.health.critical',
          status === 'HEALTHY' ? 'NORMAL' : 'EMERGENCY',
          { 
            message: customMessage || `System health degraded to ${status}`, 
            metrics: payload 
          },
          adminIds
        );
      }
    } catch (e) {
      logger.error('Failed to dispatch health alert', { error: e });
    }
  }

  public static shutdown(): void {
    if (redis) redis.disconnect();
  }
}
