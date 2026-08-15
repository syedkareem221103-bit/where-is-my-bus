import { TripAssignmentEngine } from './trip.assignment.engine';
import { prisma } from '../../config/database';
import { TripRepository } from './trip.repository';
import { BadRequestError, NotFoundError } from '../../errors';

jest.mock('../../config/database', () => ({
  prisma: {
    organization: { findUnique: jest.fn() },
    vehicle: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    route: { findUnique: jest.fn() },
    schedule: { findUnique: jest.fn() },
    trip: { findFirst: jest.fn() },
  }
}));

jest.mock('./trip.repository');

describe('TripAssignmentEngine', () => {
  let engine: TripAssignmentEngine;
  let mockTripRepository: jest.Mocked<TripRepository>;

  const orgId = 'org-1';
  const data = {
    vehicleId: 'veh-1',
    driverId: 'drv-1',
    routeId: 'rt-1',
    scheduleId: 'sch-1',
    serviceDate: '2050-01-01',
  };

  beforeEach(() => {
    engine = new TripAssignmentEngine();
    mockTripRepository = engine['tripRepository'] as jest.Mocked<TripRepository>;
    
    // Default successful mocks
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '1', organizationId: orgId, timezone: 'Asia/Kolkata' });
    (prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ id: data.vehicleId, organizationId: orgId });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: data.driverId, organizationId: orgId, role: 'DRIVER' });
    (prisma.route.findUnique as jest.Mock).mockResolvedValue({ id: data.routeId, organizationId: orgId, status: 'ACTIVE' });
    (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: data.scheduleId, organizationId: orgId, routeId: data.routeId, isActive: true });
    
    (prisma.trip.findFirst as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation for a valid assignment', async () => {
    const result = await engine.validateAssignment(orgId, data);
    expect(result).toBe(true);
  });

  it('should throw NotFoundError if organization is not found', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow(NotFoundError);
  });

  it('should throw BadRequestError if driver is missing or wrong role', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow(BadRequestError);
  });

  it('should throw BadRequestError if schedule does not belong to route', async () => {
    (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: data.scheduleId, organizationId: orgId, routeId: 'different-route', isActive: true });
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow('Schedule does not belong to the specified route');
  });

  it('should throw BadRequestError if serviceDate is in the past', async () => {
    const pastData = { ...data, serviceDate: '2000-01-01' };
    await expect(engine.validateAssignment(orgId, pastData)).rejects.toThrow(/cannot be in the past/);
  });

  it('should throw BadRequestError if driver is double booked', async () => {
    (prisma.trip.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.driverId) return { id: 'trip-1' };
      return null;
    });
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow(/Driver is already assigned/);
  });

  it('should throw BadRequestError if vehicle is double booked', async () => {
    (prisma.trip.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.vehicleId) return { id: 'trip-1' };
      return null;
    });
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow(/Vehicle is already assigned/);
  });

  it('should throw BadRequestError if schedule is double booked for the day', async () => {
    (prisma.trip.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.scheduleId) return { id: 'trip-1' };
      return null;
    });
    await expect(engine.validateAssignment(orgId, data)).rejects.toThrow(/A trip is already assigned for this schedule/);
  });
});
