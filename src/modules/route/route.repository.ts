import prisma from '../../config/database';
import { Route, Prisma, RouteStatus } from '@prisma/client';

export class RouteRepository {
  async create(data: Prisma.RouteCreateInput): Promise<Route> {
    return prisma.route.create({ data });
  }

  async findById(id: string, organizationId: string): Promise<Route | null> {
    return prisma.route.findUnique({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
    });
  }

  async findByName(name: string, organizationId: string): Promise<Route | null> {
    return prisma.route.findFirst({
      where: {
        name,
        organizationId,
      },
    });
  }

  async findAll(
    organizationId: string,
    skip: number,
    take: number,
    status?: RouteStatus,
    search?: string
  ): Promise<{ data: Route[]; total: number }> {
    const where: Prisma.RouteWhereInput = { organizationId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.route.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, organizationId: string, data: Prisma.RouteUpdateInput): Promise<Route> {
    return prisma.route.update({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      data,
    });
  }
}

export const routeRepository = new RouteRepository();
export default routeRepository;
