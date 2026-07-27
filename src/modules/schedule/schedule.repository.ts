import { prisma } from '../../config/database';
import { Schedule, Prisma } from '@prisma/client';

export class ScheduleRepository {
  async create(data: Prisma.ScheduleUncheckedCreateInput): Promise<Schedule> {
    return prisma.schedule.create({ data });
  }

  async findByIdAndOrg(id: string, organizationId: string): Promise<Schedule | null> {
    return prisma.schedule.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  async findAllByOrg(
    organizationId: string,
    skip: number,
    take: number
  ): Promise<Schedule[]> {
    return prisma.schedule.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByOrg(organizationId: string): Promise<number> {
    return prisma.schedule.count({
      where: { organizationId },
    });
  }

  async update(id: string, organizationId: string, data: Prisma.ScheduleUpdateInput): Promise<Schedule> {
    return prisma.schedule.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async delete(id: string, organizationId: string): Promise<Schedule> {
    return prisma.schedule.delete({
      where: {
        id,
        organizationId,
      },
    });
  }
}

export default ScheduleRepository;
