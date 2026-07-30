import { NotificationRepository } from './repositories/notification.repository';
import { NotificationPreferenceRepository } from './repositories/notification-preference.repository';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationService } from './services/notification.service';
import { NotificationDispatcher } from './services/notification-dispatcher';
import { MockQueueProvider } from './providers/mock-queue.provider';
import { MockEmailProvider, MockSmsProvider, MockPushProvider, MockInAppProvider } from './providers/mock-channel.provider';
import { eventBus } from '../../utils/event-bus';
import logger from '../../utils/logger';

// 1. Initialize Repositories
const notificationRepo = new NotificationRepository();
const preferenceRepo = new NotificationPreferenceRepository();
const templateRepo = new NotificationTemplateRepository();

// 2. Initialize Providers
export const queueProvider = new MockQueueProvider();
const emailProvider = new MockEmailProvider();
const smsProvider = new MockSmsProvider();
const pushProvider = new MockPushProvider();
const inAppProvider = new MockInAppProvider();

// 3. Initialize Services
export const preferenceService = new NotificationPreferenceService(preferenceRepo);
export const templateService = new NotificationTemplateService(templateRepo);
export const notificationService = new NotificationService(notificationRepo, preferenceService, queueProvider);

// 4. Initialize Dispatcher (Worker)
export const notificationDispatcher = new NotificationDispatcher(
  queueProvider,
  templateService,
  notificationRepo,
  emailProvider,
  smsProvider,
  pushProvider,
  inAppProvider
);

// 5. Start Workers
notificationDispatcher.startWorkers();

// 6. Subscribe to Domain Events
const subscribeToEvents = () => {
  const eventsToHandle = [
    { key: 'trip.assigned', priority: 'NORMAL' },
    { key: 'trip.started', priority: 'HIGH' },
    { key: 'trip.delayed', priority: 'HIGH' },
    { key: 'trip.completed', priority: 'NORMAL' },
    { key: 'trip.cancelled', priority: 'EMERGENCY' },
    { key: 'student.boarded', priority: 'NORMAL' },
    { key: 'student.dropped', priority: 'NORMAL' },
    { key: 'driver.offline', priority: 'HIGH' },
    { key: 'gps.signal.lost', priority: 'HIGH' },
    { key: 'emergency.triggered', priority: 'EMERGENCY' },
    { key: 'emergency.cleared', priority: 'HIGH' }
  ];

  for (const ev of eventsToHandle) {
    eventBus.on(ev.key, async (payload: any) => {
      try {
        const { organizationId, recipientIds, tripId, ...data } = payload;
        if (!organizationId || !recipientIds || !Array.isArray(recipientIds)) {
          logger.warn(`[NotificationModule] Invalid payload for event ${ev.key}`);
          return;
        }

        // e.g. delay/expire ETA alerts after 30 mins
        const expiresInMs = ev.key === 'trip.delayed' ? 30 * 60 * 1000 : undefined;

        await notificationService.dispatch(
          organizationId,
          ev.key,
          ev.priority,
          data,
          recipientIds,
          tripId,
          expiresInMs
        );
      } catch (err) {
        logger.error(`[NotificationModule] Error handling event ${ev.key}:`, err);
      }
    });
  }
};

subscribeToEvents();

export default {
  notificationService,
  preferenceService,
  templateService,
  queueProvider // Exposed for metrics/testing
};
