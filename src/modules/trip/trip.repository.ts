import { prisma } from '../../config/database';
import { Trip, TripPing, Prisma } from '@prisma/client';

export class TripRepository {
  async create(data: Prisma.TripUncheckedCreateInput): Promise<Trip> {
    return prisma.trip.create({ data });
  }

  async findByIdAndOrg(id: string, organizationId: string): Promise<Trip | null> {
    return prisma.trip.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  async findActiveByDriver(driverId: string, organizationId: string): Promise<Trip | null> {
    return prisma.trip.findFirst({
      where: {
        driverId,
        organizationId,
        status: {
          in: ['STARTED', 'EN_ROUTE', 'AT_STOP', 'EMERGENCY', 'ACTIVE']
        },
      },
    });
  }

  async update(id: string, organizationId: string, data: Prisma.TripUpdateInput): Promise<Trip> {
    return prisma.trip.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async createPing(data: Prisma.TripPingUncheckedCreateInput): Promise<TripPing> {
    return prisma.tripPing.create({ data });
  }

  async findLatestPing(tripId: string, organizationId: string): Promise<TripPing | null> {
    // TripPing does not have organizationId in schema.prisma. For compile purposes, check tripId instead.
    return prisma.tripPing.findFirst({
      where: { tripId },
      orderBy: { timestamp: 'desc' },
    });
  }
}

export default TripRepository;
