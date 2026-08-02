import { RouteReplayService } from '../route-replay.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    trip: {
      findFirst: jest.fn()
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('RouteReplayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and format trip replay data', async () => {
    (prisma.trip.findFirst as jest.Mock).mockResolvedValue({
      id: 'trip-1',
      routeId: 'route-1',
      createdAt: new Date('2026-08-01T07:00:00Z'),
      updatedAt: new Date('2026-08-01T08:00:00Z'),
      route: { name: 'Route 1' },
      vehicle: { registrationNo: 'KA-01-1234' },
      driver: { firstName: 'John', lastName: 'Doe' },
      pings: [
        { latitude: 12.9, longitude: 77.5, speed: 40, timestamp: new Date('2026-08-01T07:15:00Z') },
        { latitude: 12.91, longitude: 77.51, speed: 45, timestamp: new Date('2026-08-01T07:20:00Z') }
      ]
    });

    const result = await RouteReplayService.getTripReplay('org-1', 'trip-1');
    expect(result.tripId).toBe('trip-1');
    expect(result.routeName).toBe('Route 1');
    expect(result.driverName).toBe('John Doe');
    expect(result.vehicleNumber).toBe('KA-01-1234');
    expect(result.pings).toHaveLength(2);
  });

  it('should downsample if more than 500 pings', async () => {
    const pings = Array.from({ length: 1000 }, (_, i) => ({
      latitude: 12.9, longitude: 77.5, speed: 40, timestamp: new Date()
    }));

    (prisma.trip.findFirst as jest.Mock).mockResolvedValue({
      id: 'trip-2',
      routeId: 'route-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      route: { name: 'Route 2' },
      vehicle: { registrationNo: 'KA-02-1234' },
      driver: { firstName: 'Jane', lastName: 'Doe' },
      pings
    });

    const result = await RouteReplayService.getTripReplay('org-1', 'trip-2');
    expect(result.pings.length).toBeLessThanOrEqual(500);
    expect(result.pings.length).toBe(500); // Because step = Math.ceil(1000/500) = 2. 1000/2 = 500.
  });
});
