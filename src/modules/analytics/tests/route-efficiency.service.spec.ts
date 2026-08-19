import { RouteEfficiencyService } from '../route-efficiency.service';

import { prisma } from '../../../config/database';


jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    route: {
      findMany: jest.fn(),
    },
    trip: {
      count: jest.fn()
    }
  };
  const actualPrisma = jest.requireActual('@prisma/client'); return { ...actualPrisma, PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('RouteEfficiencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate Route Efficiency Score correctly', async () => {
    (prisma.route.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'route-1',
        name: 'Route 1',
        stops: [
          { sequenceOrder: 1, latitude: 12.9716, longitude: 77.5946 }, // Bangalore
          { sequenceOrder: 2, latitude: 12.2958, longitude: 76.6394 }  // Mysore (Approx 130km straight line, 169km with 1.3 multiplier)
        ],
        trips: [
          {
            status: 'COMPLETED',
            createdAt: new Date('2026-08-01T08:00:00Z'),
            updatedAt: new Date('2026-08-01T10:00:00Z'), // 120 mins
            schedule: { cutoffTime: '10:00' }, // 180 mins
            pings: [
              { timestamp: new Date('2026-08-01T08:00:00Z'), latitude: 12.9716, longitude: 77.5946, speed: 40 },
              { timestamp: new Date('2026-08-01T09:00:00Z'), latitude: 12.6, longitude: 77.0, speed: 40 },
              { timestamp: new Date('2026-08-01T10:00:00Z'), latitude: 12.2958, longitude: 76.6394, speed: 40 }
            ]
          }
        ]
      }
    ]);

    (prisma.trip.count as jest.Mock).mockResolvedValue(1); // 100% completion

    const result = await RouteEfficiencyService.getRouteEfficiency('org-1', '7d', 'route-1');

    expect(result).toHaveLength(1);
    const kpi = result[0];
    
    expect(kpi.routeName).toBe('Route 1');
    expect(kpi.efficiencyScore).toBe(100); // Because distance deviation is minimal, time deviation is 0.
    expect(kpi.timeDeviationMins).toBe(0);
    expect(kpi.routeCompletionRate).toBe(100);
    expect(kpi.stopCompliancePct).toBe(100);
  });
});
