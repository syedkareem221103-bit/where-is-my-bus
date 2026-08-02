import { driverPerformanceService } from '../driver-performance.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    user: {
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient), TripStatus: { COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' }, UserRole: { DRIVER: 'DRIVER' } };
});

describe('DriverPerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate Driver Score correctly', async () => {
    // Mock the Prisma client response
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'driver-1',
        firstName: 'John',
        lastName: 'Doe',
        trips: [
          {
            status: 'COMPLETED',
            createdAt: new Date('2026-08-01T07:00:00Z'),
            updatedAt: new Date('2026-08-01T08:00:00Z'), // On time
            emergencies: [],
            schedule: { cutoffTime: '08:00' }
          },
          {
            status: 'COMPLETED',
            createdAt: new Date('2026-08-01T08:00:00Z'),
            updatedAt: new Date('2026-08-01T10:15:00Z'), // Delayed by 15 mins (cutoff 10:00)
            emergencies: [{ id: 'e1' }], // 1 emergency
            schedule: { cutoffTime: '10:00' }
          }
        ]
      }
    ]);

    const result = await driverPerformanceService.getDriverRankings('org-1', {
      timeRange: '7d',
      sortBy: 'score',
      sortOrder: 'desc'
    });

    expect(result).toHaveLength(1);
    const kpi = result[0];
    expect(kpi.driverName).toBe('John Doe');
    expect(kpi.totalTrips).toBe(2);
    expect(kpi.completedTrips).toBe(2);
    expect(kpi.emergencyIncidents).toBe(1);
    expect(kpi.onTimeArrivalPct).toBe(50); // 1 out of 2 is on time
    expect(kpi.averageDelayMins).toBe(7.5); // 0 + 15 / 2

    // Score manual calculation:
    // Reliability (20%): 100% completion = 20
    // Safety (40%): 100 - (1 * 15) = 85 * 0.40 = 34
    // Punctuality (40%): 50% on time, average delay 7.5 (<=10 so no penalty) = 50 * 0.40 = 20
    // Total = 20 + 34 + 20 = 74
    expect(kpi.driverScore).toBe(74);
  });
});
