import { GpsTrackingService } from './gps.tracking.service';
import { TripRepository } from './trip.repository';
import { TripStateMachine } from './trip.state-machine';
import { BadRequestError } from '../../errors';

jest.mock('./trip.repository');

describe('GpsTrackingService', () => {
  let service: GpsTrackingService;
  let mockTripRepository: jest.Mocked<TripRepository>;

  const orgId = 'org-1';
  const tripId = 'trip-1';

  beforeEach(() => {
    service = new GpsTrackingService();
    mockTripRepository = service['tripRepository'] as jest.Mocked<TripRepository>;

    jest.spyOn(TripStateMachine, 'isActiveState').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPing', () => {
    it('should throw BadRequestError if trip not found', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue(null);

      await expect(
        service.recordPing(orgId, tripId, {
          latitude: 10,
          longitude: 20,
          recordedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if trip is not active', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue({ id: tripId, status: 'SCHEDULED' } as any);
      jest.spyOn(TripStateMachine, 'isActiveState').mockReturnValue(false);

      await expect(
        service.recordPing(orgId, tripId, {
          latitude: 10,
          longitude: 20,
          recordedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should silently discard duplicate/stale pings', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue({ id: tripId, status: 'STARTED' } as any);
      
      const lastPingTime = new Date('2024-01-01T10:00:00Z');
      mockTripRepository.findLatestPing.mockResolvedValue({
        id: 'ping-1',
        sequence: 5,
        timestamp: lastPingTime,
      } as any);

      const result = await service.recordPing(orgId, tripId, {
        latitude: 10,
        longitude: 20,
        recordedAt: '2024-01-01T09:59:00Z', // Older than last ping
      });

      expect(result.discarded).toBe(true);
      expect(result.ping?.id).toBe('ping-1');
      expect(mockTripRepository.createPing).not.toHaveBeenCalled();
    });

    it('should create a new ping if recordedAt is newer', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue({ id: tripId, status: 'STARTED' } as any);
      
      const lastPingTime = new Date('2024-01-01T10:00:00Z');
      mockTripRepository.findLatestPing.mockResolvedValue({
        id: 'ping-1',
        sequence: 5,
        timestamp: lastPingTime,
      } as any);

      mockTripRepository.createPing.mockResolvedValue({
        id: 'ping-2',
        sequence: 6,
      } as any);

      const result = await service.recordPing(orgId, tripId, {
        latitude: 10,
        longitude: 20,
        speed: 45,
        heading: 90,
        accuracy: 5,
        recordedAt: '2024-01-01T10:01:00Z', // Newer
      });

      expect(result.discarded).toBe(false);
      expect(result.ping?.id).toBe('ping-2');
      expect(mockTripRepository.createPing).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 10,
          longitude: 20,
          speed: 45,
          heading: 90,
          accuracy: 5,
          sequence: 6,
        })
      );
    });

    it('should create the first ping with sequence 1', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue({ id: tripId, status: 'STARTED' } as any);
      mockTripRepository.findLatestPing.mockResolvedValue(null); // No previous pings
      mockTripRepository.createPing.mockResolvedValue({
        id: 'ping-1',
        sequence: 1,
      } as any);

      const result = await service.recordPing(orgId, tripId, {
        latitude: 10,
        longitude: 20,
        recordedAt: new Date().toISOString(),
      });

      expect(result.discarded).toBe(false);
      expect(result.ping?.sequence).toBe(1);
      expect(mockTripRepository.createPing).toHaveBeenCalledWith(
        expect.objectContaining({
          sequence: 1,
          speed: 0,
          accuracy: 1.0,
        })
      );
    });
  });
});
