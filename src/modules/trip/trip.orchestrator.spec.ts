import { TripLifecycleOrchestrator } from './trip.orchestrator';
import { TripRepository } from './trip.repository';
import { TripValidationEngine } from './trip.validation.engine';
import { AuditService } from '../audit/audit.service';
import { TripStateMachine } from './trip.state-machine';
import { TripStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../errors';

jest.mock('./trip.repository');
jest.mock('./trip.validation.engine');
jest.mock('../audit/audit.service');
jest.mock('../../config/database', () => ({
  prisma: {
    organization: { findUnique: jest.fn() },
    trip: { updateMany: jest.fn(), findUnique: jest.fn() },
  }
}));

describe('TripLifecycleOrchestrator', () => {
  let orchestrator: TripLifecycleOrchestrator;
  let mockTripRepository: jest.Mocked<TripRepository>;
  let mockValidationEngine: jest.Mocked<TripValidationEngine>;
  let mockAuditService: jest.Mocked<AuditService>;

  const orgId = 'org-1';
  const actorId = 'actor-1';

  beforeEach(() => {
    orchestrator = new TripLifecycleOrchestrator();
    mockTripRepository = orchestrator['tripRepository'] as jest.Mocked<TripRepository>;
    mockValidationEngine = orchestrator['validationEngine'] as jest.Mocked<TripValidationEngine>;
    mockAuditService = orchestrator['auditService'] as jest.Mocked<AuditService>;

    jest.spyOn(TripStateMachine, 'validateTransition').mockImplementation(() => {});

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '1', organizationId: orgId, timezone: 'Asia/Kolkata' });
    
    mockTripRepository.findAssignedTripByScheduleAndDate.mockResolvedValue({ id: 'trip-1', status: 'SCHEDULED', driverId: 'drv-1', vehicleId: 'veh-1' } as any);
    mockTripRepository.findByIdAndOrg.mockResolvedValue({ id: 'trip-1', status: 'STARTED', driverId: 'drv-1', vehicleId: 'veh-1' } as any);
    
    (prisma.trip.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.trip.findUnique as jest.Mock).mockImplementation(({ where }) => {
      return { id: where.id, status: 'STARTED' };
    });
    
    mockValidationEngine.validateStart.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startTrip', () => {
    it('should transition to STARTED and log audit', async () => {
      const data = { scheduleId: 'sch-1', vehicleId: 'veh-1', driverId: 'drv-1' };
      
      const trip = await orchestrator.startTrip(orgId, data, actorId, '127.0.0.1');

      expect(mockValidationEngine.validateStart).toHaveBeenCalled();
      expect(TripStateMachine.validateTransition).toHaveBeenCalledWith('SCHEDULED', 'STARTED');
      expect(prisma.trip.updateMany).toHaveBeenCalledWith({
        where: { id: 'trip-1', organizationId: orgId, status: 'SCHEDULED' },
        data: { status: 'STARTED' },
      });
      
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        userId: actorId,
        action: 'TRIP_STATUS_UPDATED',
        ipAddress: '127.0.0.1',
      }));
      expect(trip.status).toBe('STARTED');
    });

    it('should throw NotFoundError if organization not found', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(orchestrator.startTrip(orgId, { scheduleId: 'sch-1', vehicleId: 'veh-1', driverId: 'drv-1' }, actorId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('endTrip', () => {
    it('should transition to COMPLETED and log audit', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({ id: 'trip-1', status: 'COMPLETED' });

      const trip = await orchestrator.endTrip(orgId, 'trip-1', actorId);

      expect(TripStateMachine.validateTransition).toHaveBeenCalledWith('STARTED', 'COMPLETED');
      expect(prisma.trip.updateMany).toHaveBeenCalledWith({
        where: { id: 'trip-1', organizationId: orgId, status: 'STARTED' },
        data: { status: 'COMPLETED' },
      });
      expect(mockAuditService.logEvent).toHaveBeenCalled();
      expect(trip.status).toBe('COMPLETED');
    });

    it('should throw NotFoundError if trip not found', async () => {
      mockTripRepository.findByIdAndOrg.mockResolvedValue(null);
      await expect(orchestrator.endTrip(orgId, 'trip-1', actorId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTripStatus', () => {
    it('should transition status and log audit', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({ id: 'trip-1', status: 'EN_ROUTE' });

      const trip = await orchestrator.updateTripStatus(orgId, 'trip-1', 'EN_ROUTE', actorId);

      expect(TripStateMachine.validateTransition).toHaveBeenCalledWith('STARTED', 'EN_ROUTE');
      expect(prisma.trip.updateMany).toHaveBeenCalledWith({
        where: { id: 'trip-1', organizationId: orgId, status: 'STARTED' },
        data: { status: 'EN_ROUTE' },
      });
      expect(mockAuditService.logEvent).toHaveBeenCalled();
      expect(trip.status).toBe('EN_ROUTE');
    });
  });
});
