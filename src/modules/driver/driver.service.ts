import bcryptjs from 'bcryptjs';
import { driverRepository } from './driver.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, UserStatus, UserRole } from '@prisma/client';

export class DriverService {
  async createDriver(data: any, actorId: string, actorRole: UserRole, organizationId: string) {
    const existingEmail = await driverRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError(`User with email '${data.email}' already exists`);
    }

    const existingLicense = await driverRepository.findByLicenseNumber(data.licenseNumber);
    if (existingLicense) {
      throw new ConflictError(`Driver license '${data.licenseNumber}' already exists`);
    }

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(data.password, salt);

    const driver = await driverRepository.createDriverWithLicense(
      {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        organization: { connect: { organizationId } },
      },
      {
        licenseNumber: data.licenseNumber,
        expiryDate: new Date(data.expiryDate),
        licenseClass: data.licenseClass,
      }
    );

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'DRIVER_CREATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { driverId: driver.id, email: driver.email, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return driver;
  }

  async getDrivers(organizationId: string, page: number, limit: number, status?: UserStatus, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await driverRepository.findAll(organizationId, skip, limit, status, search);

    return {
      drivers: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDriver(id: string, organizationId: string) {
    const driver = await driverRepository.findById(id, organizationId);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }
    return driver;
  }

  async updateDriver(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole) {
    const driver = await this.getDriver(id, organizationId);

    // OPERATOR role restricted to status updates only
    if (actorRole === 'OPERATOR') {
      if (data.firstName || data.lastName || data.licenseNumber || data.expiryDate || data.licenseClass) {
        throw new ForbiddenError('OPERATOR is only permitted to update driver status');
      }
    }

    // If changing license number, check duplicate
    if (data.licenseNumber && data.licenseNumber !== driver.driverLicense?.licenseNumber) {
      const existingLicense = await driverRepository.findByLicenseNumber(data.licenseNumber);
      if (existingLicense) {
        throw new ConflictError(`Driver license '${data.licenseNumber}' already exists`);
      }
    }

    const userData: Prisma.UserUpdateInput = {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.status && { status: data.status }),
    };

    const licenseData: Prisma.DriverLicenseUpdateInput = {
      ...(data.licenseNumber && { licenseNumber: data.licenseNumber }),
      ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
      ...(data.licenseClass && { licenseClass: data.licenseClass }),
    };

    const updated = await driverRepository.updateDriverWithLicense(id, organizationId, userData, licenseData);

    const action = data.status && data.status !== driver.status ? 'DRIVER_STATUS_CHANGED' : 'DRIVER_UPDATED';

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action,
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { driverId: driver.id, targetOrganizationId: organizationId, updates: Object.keys(userData) },
        ipAddress: '0.0.0.0',
      },
    });

    return updated;
  }

  async deleteDriver(id: string, organizationId: string, actorId: string, actorRole: UserRole) {
    const driver = await this.getDriver(id, organizationId);

    if (id === actorId) {
      throw new ForbiddenError('You cannot delete your own driver account');
    }

    const deleted = await driverRepository.updateDriverWithLicense(id, organizationId, { status: UserStatus.DEACTIVATED });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'DRIVER_DELETED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { driverId: driver.id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return deleted;
  }
}

export const driverService = new DriverService();
export default driverService;
