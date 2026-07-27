import { organizationRepository } from './organization.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Organization } from '@prisma/client';

export class OrganizationService {
  async createOrganization(data: Prisma.OrganizationCreateInput, adminId: string): Promise<Organization> {
    const existing = await organizationRepository.findByOrganizationId(data.organizationId);
    if (existing) {
      throw new ConflictError('Organization with this ID already exists');
    }

    const org = await organizationRepository.create(data);

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_CREATED',
        userId: adminId,
        organizationId: org.id,
        metadata: { name: org.name, type: org.type },
        ipAddress: '0.0.0.0', // Service layer default
      },
    });

    return org;
  }

  async getOrganizations(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { data, total } = await organizationRepository.findAll(skip, limit);

    return {
      organizations: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrganization(id: string): Promise<Organization> {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  }

  async updateOrganization(id: string, data: Prisma.OrganizationUpdateInput, userId: string): Promise<Organization> {
    const org = await this.getOrganization(id);

    const updated = await organizationRepository.update(id, data);

    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_UPDATED',
        userId,
        organizationId: org.id,
        metadata: JSON.parse(JSON.stringify(data)),
        ipAddress: '0.0.0.0',
      },
    });

    return updated;
  }

  async deleteOrganization(id: string, userId: string): Promise<Organization> {
    const org = await this.getOrganization(id);

    const deleted = await organizationRepository.update(id, { status: 'DEACTIVATED' });

    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_DEACTIVATED',
        userId,
        organizationId: org.id,
        metadata: { previousStatus: org.status },
        ipAddress: '0.0.0.0',
      },
    });

    return deleted;
  }
}

export const organizationService = new OrganizationService();
