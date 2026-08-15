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

  async findAssignedTripByDriverAndDate(driverId: string, serviceDate: string, organizationId: string): Promise<Trip | null> {
    return prisma.trip.findFirst({
      where: {
        driverId,
        serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
      },
    });
  }

  async findAssignedTripByVehicleAndDate(vehicleId: string, serviceDate: string, organizationId: string): Promise<Trip | null> {
    return prisma.trip.findFirst({
      where: {
        vehicleId,
        serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
      },
    });
  }

  async findAssignedTripByScheduleAndDate(scheduleId: string, serviceDate: string, organizationId: string): Promise<Trip | null> {
    return prisma.trip.findFirst({
      where: {
        scheduleId,
        serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
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
    return prisma.tripPing.findFirst({
      where: { tripId, organizationId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findStopsByRouteId(routeId: string, organizationId: string) {
    return prisma.stop.findMany({
      where: { routeId, organizationId },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  async findActiveTrips(organizationId: string) {
    return prisma.trip.findMany({
      where: {
        organizationId,
        status: {
          in: ['STARTED', 'EN_ROUTE', 'AT_STOP', 'ACTIVE']
        }
      }
    });
  }
}

export default TripRepository;
