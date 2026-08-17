import { NotificationService } from '../services/notification.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { RedisQueueProvider } from '../providers/redis-queue.provider';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';

// Mock the Repositories
jest.mock('../repositories/notification.repository');
jest.mock('../repositories/notification-preference.repository');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockQueueProvider: RedisQueueProvider;
  let mockPrefRepo: jest.Mocked<NotificationPreferenceRepository>;
  let mockNotifRepo: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    mockNotifRepo = new NotificationRepository() as jest.Mocked<NotificationRepository>;
    mockPrefRepo = new NotificationPreferenceRepository() as jest.Mocked<NotificationPreferenceRepository>;
    
    mockNotifRepo.createNotificationWithRecipients = jest.fn().mockResolvedValue({ id: 'notif-1' } as any);

    const prefService = new NotificationPreferenceService(mockPrefRepo);
    mockQueueProvider = new RedisQueueProvider();

    notificationService = new NotificationService(mockNotifRepo, prefService, mockQueueProvider);
  });

  afterEach(async () => {
    await mockQueueProvider.shutdown();
    jest.clearAllMocks();
  });

  it('should fan-out notifications correctly considering preferences', async () => {
    // User 1 has email enabled, others disabled
    mockPrefRepo.getManyByUserIds.mockImplementation(async (orgId, userIds) => {
      return userIds.map(userId => {
        if (userId === 'user-1') {
          return { userId, emailEnabled: true, inAppEnabled: false, smsEnabled: false, pushEnabled: false, emergencyOverride: true } as any;
        }
        return null;
      }).filter(Boolean);
    });

    await notificationService.dispatch('org-1', 'trip.started', 'HIGH', { tripId: 'trip-1' }, ['user-1', 'user-2']);

    expect(mockNotifRepo.createNotificationWithRecipients).toHaveBeenCalled();

    // Verify queue jobs
    const depthHigh = await mockQueueProvider.getQueueDepth('HIGH');
    // user-1 has email enabled -> 1 job
    // user-2 has default pref -> inApp, push, sms (3 jobs)
    // total = 4 jobs
    expect(depthHigh).toBe(4);
  });

  it('should suppress notifications during quiet hours except for emergencies', async () => {
    mockPrefRepo.getManyByUserIds.mockResolvedValue([{
      userId: 'user-1',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      emergencyOverride: true,
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59' // always quiet
    } as any]);

    // NORMAL priority -> Suppressed
    await notificationService.dispatch('org-1', 'trip.started', 'NORMAL', {}, ['user-1']);
    let depth = await mockQueueProvider.getQueueDepth('NORMAL');
    expect(depth).toBe(0);

    // EMERGENCY priority -> Sent despite quiet hours
    await notificationService.dispatch('org-1', 'trip.cancelled', 'EMERGENCY', {}, ['user-1']);
    depth = await mockQueueProvider.getQueueDepth('EMERGENCY');
    expect(depth).toBe(4); // email, inApp, sms, push
  });
});
