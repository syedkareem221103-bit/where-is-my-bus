import { organizationRepository } from './organization.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Organization } from '@prisma/client';

export class OrganizationService {
  async createOrganization(data: Prisma.OrganizationCreateInput, adminId: string, ipAddress: string): Promise<Organization> {
    const existing = await organizationRepository.findByOrganizationId(data.organizationId);
    if (existing) {
      throw new ConflictError('Organization with this ID already exists');
    }

    const [org] = await prisma.$transaction([
      prisma.organization.create({ data }),
      prisma.auditLog.create({
        data: {
          action: 'ORGANIZATION_CREATED',
          userId: adminId,
          organizationId: data.organizationId,
          metadata: { name: data.name, type: data.type },
          ipAddress,
        },
      })
    ]);

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

  async updateOrganization(id: string, data: Prisma.OrganizationUpdateInput, userId: string, ipAddress: string): Promise<Organization> {
    const org = await this.getOrganization(id);

    const [updated] = await prisma.$transaction([
      prisma.organization.update({
        where: { id },
        data,
      }),
      prisma.auditLog.create({
        data: {
          action: 'ORGANIZATION_UPDATED',
          userId,
          organizationId: org.organizationId,
          metadata: JSON.parse(JSON.stringify(data)),
          ipAddress,
        },
      })
    ]);

    return updated;
  }

  async deleteOrganization(id: string, userId: string, ipAddress: string): Promise<Organization> {
    const org = await this.getOrganization(id);

    const [deleted] = await prisma.$transaction([
      prisma.organization.update({
        where: { id },
        data: { status: 'DEACTIVATED' }
      }),
      prisma.auditLog.create({
        data: {
          action: 'ORGANIZATION_DEACTIVATED',
          userId,
          organizationId: org.organizationId,
          metadata: { previousStatus: org.status },
          ipAddress,
        },
      })
    ]);

    return deleted;
  }
}

export const organizationService = new OrganizationService();
