import prisma from '../../config/database';
import { Organization, Prisma } from '@prisma/client';

export class OrganizationRepository {
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { organizationId } });
  }

  async findAll(skip: number, take: number): Promise<{ data: Organization[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.organization.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count(),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data,
    });
  }
}

export const organizationRepository = new OrganizationRepository();
