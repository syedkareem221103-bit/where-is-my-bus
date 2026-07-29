import { LiveTrackingService } from './live-tracking.service';
import { prisma } from '../config/database';

jest.mock('../config/database', () => ({
  prisma: {
    trip: {
      findFirst: jest.fn(),
    },
    studentStop: {
      findFirst: jest.fn(),
    },
  },
}));

describe('LiveTrackingService', () => {
  let service: LiveTrackingService;

  beforeEach(() => {
    service = LiveTrackingService.getInstance();
    jest.clearAllMocks();
  });

  describe('authorizeJoinTrip', () => {
    it('should allow ORG_ADMIN to join if trip belongs to org', async () => {
      (prisma.trip.findFirst as jest.Mock).mockResolvedValue({ id: 'trip-1' });

      const result = await service.authorizeJoinTrip('trip-1', {
        userId: 'admin-1',
        organizationId: 'org-1',
        role: 'ORG_ADMIN',
      });

      expect(result).toBe(true);
      expect(prisma.trip.findFirst).toHaveBeenCalledWith({
        where: { id: 'trip-1', organizationId: 'org-1' },
      });
    });

    it('should reject DRIVER if trip is not assigned to them', async () => {
      (prisma.trip.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.authorizeJoinTrip('trip-1', {
        userId: 'driver-1',
        organizationId: 'org-1',
        role: 'DRIVER',
      });

      expect(result).toBe(false);
      expect(prisma.trip.findFirst).toHaveBeenCalledWith({
        where: { id: 'trip-1', organizationId: 'org-1', driverId: 'driver-1' },
      });
    });

    it('should allow PARENT if they have a child on the trip route', async () => {
      (prisma.trip.findFirst as jest.Mock).mockResolvedValue({ id: 'trip-1', routeId: 'route-1' });
      (prisma.studentStop.findFirst as jest.Mock).mockResolvedValue({ id: 'stop-1' });

      const result = await service.authorizeJoinTrip('trip-1', {
        userId: 'parent-1',
        organizationId: 'org-1',
        role: 'PARENT',
      });

      expect(result).toBe(true);
      expect(prisma.studentStop.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          stop: { routeId: 'route-1' },
          student: {
            parentChildren: {
              some: { parentId: 'parent-1' },
            },
          },
        },
      });
    });
  });
});
