import { AuditService } from '../audit/audit.service';
import { vehicleRepository } from './vehicle.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Vehicle, VehicleStatus, UserRole } from '@prisma/client';

export class VehicleService {
  async createVehicle(data: any, actorId: string, actorRole: UserRole, organizationId: string): Promise<Vehicle> {
    const existing = await vehicleRepository.findByRegistrationNo(data.registrationNo);
    if (existing) {
      throw new ConflictError(`Vehicle with registration number '${data.registrationNo}' already exists`);
    }

    const vehicle = await vehicleRepository.create({
      registrationNo: data.registrationNo,
      capacity: data.capacity,
      status: data.status || VehicleStatus.ACTIVE,
      organization: { connect: { organizationId } },
    });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'VEHICLE_CREATED',
        metadata: { vehicleId: vehicle.id, registrationNo: vehicle.registrationNo, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0'
      });

    return vehicle;
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

  async updateVehicle(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole): Promise<Vehicle> {
    const vehicle = await this.getVehicle(id, organizationId);

    // OPERATOR can only update status
    if (actorRole === 'OPERATOR') {
      if (data.registrationNo || data.capacity !== undefined) {
        throw new ForbiddenError('OPERATOR is only permitted to update vehicle status');
      }
    }

    // Check registration number duplicate if modified
    if (data.registrationNo && data.registrationNo !== vehicle.registrationNo) {
      const existing = await vehicleRepository.findByRegistrationNo(data.registrationNo);
      if (existing) {
        throw new ConflictError(`Vehicle with registration number '${data.registrationNo}' already exists`);
      }
    }

    const updateData: Prisma.VehicleUpdateInput = {
      ...(data.registrationNo && { registrationNo: data.registrationNo }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.status && { status: data.status }),
    };

    const updated = await vehicleRepository.update(id, organizationId, updateData);

    const action = data.status && data.status !== vehicle.status ? 'VEHICLE_STATUS_CHANGED' : 'VEHICLE_UPDATED';

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: action,
        metadata: { vehicleId: vehicle.id, targetOrganizationId: organizationId, updates: Object.keys(updateData) },
        ipAddress: '0.0.0.0'
      });

    return updated;
  }

  async deleteVehicle(id: string, organizationId: string, actorId: string, actorRole: UserRole): Promise<Vehicle> {
    const vehicle = await this.getVehicle(id, organizationId);

    const deleted = await vehicleRepository.update(id, organizationId, { status: VehicleStatus.INACTIVE });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'VEHICLE_DEACTIVATED',
        metadata: { vehicleId: vehicle.id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0'
      });

    return deleted;
  }
}

export const vehicleService = new VehicleService();
export const busService = vehicleService;
export default vehicleService;
