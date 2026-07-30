import { NotificationService } from '../services/notification.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { MockQueueProvider } from '../providers/mock-queue.provider';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';

// Mock the Repositories
jest.mock('../repositories/notification.repository');
jest.mock('../repositories/notification-preference.repository');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockQueueProvider: MockQueueProvider;
  let mockPrefRepo: jest.Mocked<NotificationPreferenceRepository>;
  let mockNotifRepo: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    mockNotifRepo = new NotificationRepository() as jest.Mocked<NotificationRepository>;
    mockPrefRepo = new NotificationPreferenceRepository() as jest.Mocked<NotificationPreferenceRepository>;
    
    mockNotifRepo.createNotification.mockResolvedValue({ id: 'notif-1' } as any);
    mockNotifRepo.createRecipients.mockResolvedValue();

    const prefService = new NotificationPreferenceService(mockPrefRepo);
    mockQueueProvider = new MockQueueProvider();

    notificationService = new NotificationService(mockNotifRepo, prefService, mockQueueProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fan-out notifications correctly considering preferences', async () => {
    // User 1 has email enabled, others disabled
    mockPrefRepo.getByUserId.mockImplementation(async (orgId, userId) => {
      if (userId === 'user-1') {
        return { emailEnabled: true, inAppEnabled: false, smsEnabled: false, pushEnabled: false, emergencyOverride: true } as any;
      }
      return null;
    });

    await notificationService.dispatch('org-1', 'trip.started', 'HIGH', { tripId: 'trip-1' }, ['user-1', 'user-2']);

    expect(mockNotifRepo.createNotification).toHaveBeenCalled();
    expect(mockNotifRepo.createRecipients).toHaveBeenCalled();

    // Verify queue jobs
    const depthHigh = await mockQueueProvider.getQueueDepth('HIGH');
    // user-1 has email enabled -> 1 job
    // user-2 has default pref -> inApp, push, sms (3 jobs)
    // total = 4 jobs
    expect(depthHigh).toBe(4);
  });

  it('should suppress notifications during quiet hours except for emergencies', async () => {
    mockPrefRepo.getByUserId.mockResolvedValue({
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      emergencyOverride: true,
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59' // always quiet
    } as any);

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
