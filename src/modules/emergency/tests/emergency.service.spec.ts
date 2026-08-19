import { EmergencyService } from '../services/emergency.service';
import { EmergencyRepository } from '../repositories/emergency.repository';
import { eventBus } from '../../../utils/event-bus';
import { EmergencyStatus, EmergencyCategory, EmergencySeverity } from '@prisma/client';

jest.mock('../repositories/emergency.repository');
jest.mock('../../../utils/event-bus', () => ({
  eventBus: {
    emitEvent: jest.fn(),
    on: jest.fn()
  }
}));

describe('EmergencyService', () => {
  let service: EmergencyService;
  let mockRepo: jest.Mocked<EmergencyRepository>;

  beforeEach(() => {
    mockRepo = new EmergencyRepository() as jest.Mocked<EmergencyRepository>;
    service = new EmergencyService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmergency', () => {
    it('should throw an error if an active emergency already exists for the trip', async () => {
      mockRepo.findActiveByTripId.mockResolvedValue({ id: 'existing-id' } as any);

      await expect(
        service.createEmergency({
          organizationId: 'org-1',
          tripId: 'trip-1',
          reporterId: 'user-1',
          category: EmergencyCategory.SOS
        })
      ).rejects.toThrow('An active emergency already exists for this trip');
    });

    it('should create an emergency and emit an event', async () => {
      mockRepo.findActiveByTripId.mockResolvedValue(null);
      mockRepo.createWithHistory.mockResolvedValue({
        id: 'new-id',
        organizationId: 'org-1',
        tripId: 'trip-1',
        reporterId: 'user-1',
        category: EmergencyCategory.SOS,
        severity: EmergencySeverity.HIGH,
        status: EmergencyStatus.ACTIVE,
        correlationId: 'corr-id'
      } as any);

      await service.createEmergency({
        organizationId: 'org-1',
        tripId: 'trip-1',
        reporterId: 'user-1',
        category: EmergencyCategory.SOS
      });

      expect(mockRepo.createWithHistory).toHaveBeenCalled();
      expect(eventBus.emitEvent).toHaveBeenCalledWith('emergency.created', expect.any(Object));
    });
  });

  describe('transitionState', () => {
    it('should throw if emergency not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(
        service.transitionState('id', 1, EmergencyStatus.ACKNOWLEDGED, 'user-1')
      ).rejects.toThrow('Emergency not found');
    });

    it('should throw on invalid state transition (ACTIVE -> RESOLVED)', async () => {
      mockRepo.findById.mockResolvedValue({ status: EmergencyStatus.ACTIVE } as any);
      await expect(
        service.transitionState('id', 1, EmergencyStatus.RESOLVED, 'user-1')
      ).rejects.toThrow('Invalid transition from ACTIVE to RESOLVED');
    });

    it('should successfully transition from ACTIVE to ACKNOWLEDGED', async () => {
      mockRepo.findById.mockResolvedValue({ status: EmergencyStatus.ACTIVE } as any);
      mockRepo.transitionState.mockResolvedValue({
        id: 'id',
        status: EmergencyStatus.ACKNOWLEDGED,
        organizationId: 'org-1',
        tripId: 'trip-1'
      } as any);

      await service.transitionState('id', 1, EmergencyStatus.ACKNOWLEDGED, 'user-1');

      expect(mockRepo.transitionState).toHaveBeenCalledWith('id', 1, EmergencyStatus.ACKNOWLEDGED, 'user-1', undefined);
      expect(eventBus.emitEvent).toHaveBeenCalledWith('emergency.acknowledged', expect.any(Object));
    });
  });
});
