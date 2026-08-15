import { vehicleRepository } from './vehicle.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Vehicle, VehicleStatus, UserRole } from '@prisma/client';

export class VehicleService {
  async createVehicle(data: any, actorId: string, actorRole: UserRole, organizationId: string, ipAddress: string = '0.0.0.0'): Promise<Vehicle> {
    return prisma.$transaction(async (tx) => {
      const existing = await vehicleRepository.findByRegistrationNo(data.registrationNo, tx);
      if (existing) {
        throw new ConflictError(`Vehicle with registration number '${data.registrationNo}' already exists`);
      }

      const vehicle = await vehicleRepository.create({
        registrationNo: data.registrationNo,
        capacity: data.capacity,
        status: data.status || VehicleStatus.ACTIVE,
        organization: { connect: { organizationId } },
      }, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await tx.auditLog.create({
        data: {
          action: 'VEHICLE_CREATED',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { vehicleId: vehicle.id, registrationNo: vehicle.registrationNo, targetOrganizationId: organizationId },
          ipAddress,
        },
      });

      return vehicle;
    });
  }

  async getVehicles(organizationId: string, page: number, limit: number, status?: VehicleStatus, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await vehicleRepository.findAll(organizationId, skip, limit, status, search);

    return {
      vehicles: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVehicle(id: string, organizationId: string): Promise<Vehicle> {
    const vehicle = await vehicleRepository.findById(id, organizationId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
    return vehicle;
  }

  async updateVehicle(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole, ipAddress: string = '0.0.0.0'): Promise<Vehicle> {
    return prisma.$transaction(async (tx) => {
      const vehicle = await vehicleRepository.findById(id, organizationId, tx);
      if (!vehicle) throw new NotFoundError('Vehicle not found');

      // OPERATOR can only update status
      if (actorRole === 'OPERATOR') {
        if (data.registrationNo || data.capacity !== undefined) {
          throw new ForbiddenError('OPERATOR is only permitted to update vehicle status');
        }
      }

      if (data.status && data.status !== vehicle.status && (data.status === 'INACTIVE' || data.status === 'MAINTENANCE')) {
        const activeTrips = await tx.trip.findFirst({
          where: {
            vehicleId: id,
            organizationId,
            status: { in: ['SCHEDULED', 'STARTED', 'EN_ROUTE', 'AT_STOP', 'EMERGENCY', 'ACTIVE'] }
          }
        });
        if (activeTrips) throw new ConflictError('Cannot change status of a vehicle with active trips');
      }

      // Check registration number duplicate if modified
      if (data.registrationNo && data.registrationNo !== vehicle.registrationNo) {
        const existing = await vehicleRepository.findByRegistrationNo(data.registrationNo, tx);
        if (existing) {
          throw new ConflictError(`Vehicle with registration number '${data.registrationNo}' already exists`);
        }
      }

      const updateData: Prisma.VehicleUpdateInput = {
        ...(data.registrationNo && { registrationNo: data.registrationNo }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.status && { status: data.status }),
      };

      const updated = await vehicleRepository.update(id, organizationId, updateData, tx);

      const action = data.status && data.status !== vehicle.status ? 'VEHICLE_STATUS_CHANGED' : 'VEHICLE_UPDATED';

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await tx.auditLog.create({
        data: {
          action,
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { vehicleId: vehicle.id, targetOrganizationId: organizationId, updates: Object.keys(updateData) },
          ipAddress,
        },
      });

      return updated;
    });
  }

  async deleteVehicle(id: string, organizationId: string, actorId: string, actorRole: UserRole, ipAddress: string = '0.0.0.0'): Promise<Vehicle> {
    return prisma.$transaction(async (tx) => {
      const vehicle = await vehicleRepository.findById(id, organizationId, tx);
      if (!vehicle) throw new NotFoundError('Vehicle not found');

      const activeTrips = await tx.trip.findFirst({
        where: {
          vehicleId: id,
          organizationId,
          status: { in: ['SCHEDULED', 'STARTED', 'EN_ROUTE', 'AT_STOP', 'EMERGENCY', 'ACTIVE'] }
        }
      });
      if (activeTrips) throw new ConflictError('Cannot deactivate a vehicle with active trips');

      const deleted = await vehicleRepository.update(id, organizationId, { status: VehicleStatus.INACTIVE }, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await tx.auditLog.create({
        data: {
          action: 'VEHICLE_DEACTIVATED',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { vehicleId: vehicle.id, targetOrganizationId: organizationId },
          ipAddress,
        },
      });

      return deleted;
    });
  }
}

export const vehicleService = new VehicleService();
export const busService = vehicleService;
export default vehicleService;
