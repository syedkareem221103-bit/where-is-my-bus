import { PrismaClient, AlertCategory, AlertPriority, AlertStatus, SmartAlert, TripPing } from '@prisma/client';
import Redis from 'ioredis';
import logger from '../../utils/logger';
import { EventDispatcher } from '../../realtime/services/event-dispatcher.service';
import { notificationService } from '../notification/notification.module';

const prisma = new PrismaClient();

export interface AlertPayload {
  organizationId: string;
  tripId?: string;
  geofenceId?: string;
  category: AlertCategory;
  priority: AlertPriority;
  message: string;
  metadata?: any;
}

import { EvaluationResult } from '../geofence/geofence.evaluation.service';

export class AlertProcessingService {
  private static instance: AlertProcessingService;
  private redis: Redis;

  private constructor() {
    if (process.env.NODE_ENV === 'test') {
      const RedisMock = require('ioredis-mock');
      this.redis = new RedisMock();
    } else {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
  }

  public static getInstance(): AlertProcessingService {
    if (!AlertProcessingService.instance) {
      AlertProcessingService.instance = new AlertProcessingService();
    }
    return AlertProcessingService.instance;
  }

  /**
   * Evaluates the persistence policy and dispatches the alert.
   * Only HIGH, CRITICAL, or state-changing alerts are persisted.
   */
  public async processAlert(payload: AlertPayload): Promise<SmartAlert | null> {
    try {
      // 1. Deduplication using Redis
      // For example, avoid sending duplicate SPEEDING alerts for the same trip within 2 minutes.
      const dedupKey = `alert:${payload.organizationId}:${payload.tripId}:${payload.category}:${payload.geofenceId || 'none'}`;
      const isDuplicate = await this.redis.get(dedupKey);

      if (isDuplicate) {
        return null; // Skip duplicate
      }

      // Set deduplication lock (e.g., 2 minutes)
      await this.redis.set(dedupKey, '1', 'EX', 120);

      const isTransient = payload.priority === 'LOW' && payload.category !== 'ROUTE_DEVIATION';

      let alertData: Partial<SmartAlert> = {
        organizationId: payload.organizationId,
        tripId: payload.tripId,
        geofenceId: payload.geofenceId,
        category: payload.category,
        priority: payload.priority,
        message: payload.message,
        metadata: payload.metadata || {},
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      if (!isTransient) {
        // Persist to database
        const savedAlert = await prisma.smartAlert.create({
          data: {
            organizationId: payload.organizationId,
            tripId: payload.tripId,
            geofenceId: payload.geofenceId,
            category: payload.category,
            priority: payload.priority,
            message: payload.message,
            metadata: payload.metadata || {},
            status: 'ACTIVE',
          }
        });
        alertData = savedAlert;
      }

      // Broadcast via EventDispatcher (Socket.IO)
      EventDispatcher.getInstance().broadcast(
        `admin_${payload.organizationId}`, 
        'alert.new',
        payload.organizationId,
        alertData
      );

      // If High/Critical, hook into NotificationService
      if (!isTransient && (payload.priority === 'HIGH' || payload.priority === 'CRITICAL')) {
        // Find org admins to notify (assuming a helper or fetching users with role ORG_ADMIN, 
        // for simplicity we dispatch to a generic event 'alert.critical' and the preference service resolves it, 
        // or we fetch admins. Let's just pass an empty recipientIds array if we don't have them, 
        // or mock fetching admins. In a real app we'd query users).
        prisma.user.findMany({ where: { organizationId: payload.organizationId, role: 'ORG_ADMIN' } })
          .then(admins => {
            const adminIds = admins.map(a => a.id);
            if (adminIds.length > 0) {
              notificationService.dispatch(
                payload.organizationId,
                'alert.critical',
                payload.priority,
                { alertId: alertData.id, message: payload.message },
                adminIds,
                payload.tripId
              ).catch(err => logger.error('Failed to dispatch alert notification', { error: err }));
            }
          });
      }

      return (alertData as SmartAlert) || null;
    } catch (error) {
      logger.error('Failed to process smart alert', { error });
      return null;
    }
  }

  public async acknowledgeAlert(orgId: string, alertId: string, userId: string): Promise<SmartAlert> {
    const alert = await prisma.smartAlert.update({
      where: { id: alertId, organizationId: orgId },
      data: { status: 'ACKNOWLEDGED' }
    });

    // Broadcast update
    EventDispatcher.getInstance().broadcast(`admin_${orgId}`, 'alert.updated', orgId, alert);
    
    // Audit logging could be appended here
    return alert;
  }

  public async resolveAlert(orgId: string, alertId: string, userId: string, notes?: string): Promise<SmartAlert> {
    const alert = await prisma.smartAlert.update({
      where: { id: alertId, organizationId: orgId },
      data: { 
        status: 'RESOLVED',
        resolvedAt: new Date(),
        metadata: notes ? { resolutionNotes: notes } : {} // simplistic merge
      }
    });

    EventDispatcher.getInstance().broadcast(`admin_${orgId}`, 'alert.updated', orgId, alert);
    
    // Audit logging could be appended here
    return alert;
  }

  /**
   * Evaluates the rules for a given ping and spatial results.
   */
  public async evaluateRulesAndDispatch(
    orgId: string,
    tripId: string,
    ping: TripPing,
    gfResults: EvaluationResult[]
  ): Promise<void> {
    for (const gf of gfResults) {
      const stateKey = `gf_state:${tripId}:${gf.geofenceId}`;
      const wasInsideStr = await this.redis.get(stateKey);
      const wasInside = wasInsideStr === '1';

      if (gf.isInside && !wasInside) {
        // ENTER EVENT
        await this.redis.set(stateKey, '1');
        
        let category: AlertCategory = 'GEOFENCE_ENTER';
        let priority: AlertPriority = 'LOW';
        let message = `Vehicle entered ${gf.type.toLowerCase()} geofence: ${gf.geofenceName}`;
        
        if (gf.type === 'RESTRICTED') {
          category = 'UNAUTHORIZED_AREA';
          priority = 'CRITICAL';
          message = `Vehicle entered restricted area: ${gf.geofenceName}`;
        }

        await this.processAlert({
          organizationId: orgId,
          tripId,
          geofenceId: gf.geofenceId,
          category,
          priority,
          message,
          metadata: { timestamp: ping.timestamp }
        });
      } else if (!gf.isInside && wasInside) {
        // EXIT EVENT
        await this.redis.set(stateKey, '0');
        
        await this.processAlert({
          organizationId: orgId,
          tripId,
          geofenceId: gf.geofenceId,
          category: 'GEOFENCE_EXIT',
          priority: 'LOW',
          message: `Vehicle exited ${gf.type.toLowerCase()} geofence: ${gf.geofenceName}`,
          metadata: { timestamp: ping.timestamp }
        });
      }

      // SPEEDING check if inside geofence with speed limit
      if (gf.isInside && ping.speed > 60) { // simplistic global 60km/h limit for example
        await this.processAlert({
          organizationId: orgId,
          tripId,
          geofenceId: gf.geofenceId,
          category: 'SPEEDING',
          priority: ping.speed > 80 ? 'CRITICAL' : 'MEDIUM',
          message: `Vehicle speeding at ${ping.speed} km/h in ${gf.geofenceName}`,
          metadata: { speed: ping.speed }
        });
      }
    }
  }
}

export default AlertProcessingService.getInstance();
