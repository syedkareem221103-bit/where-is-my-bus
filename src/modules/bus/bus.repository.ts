import prisma from '../../config/database';
import { Vehicle, Prisma, VehicleStatus } from '@prisma/client';

export class VehicleRepository {
  async create(data: Prisma.VehicleCreateInput): Promise<Vehicle> {
    return prisma.vehicle.create({ data });
  }

  async findById(id: string, organizationId: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
    });
  }

  async findByRegistrationNo(registrationNo: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { registrationNo },
    });
  }

  async findAll(
    organizationId: string,
    skip: number,
    take: number,
    status?: VehicleStatus,
    search?: string
  ): Promise<{ data: Vehicle[]; total: number }> {
    const where: Prisma.VehicleWhereInput = { organizationId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.registrationNo = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, organizationId: string, data: Prisma.VehicleUpdateInput): Promise<Vehicle> {
    return prisma.vehicle.update({
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

export const vehicleRepository = new VehicleRepository();
export const busRepository = vehicleRepository;
export default vehicleRepository;
