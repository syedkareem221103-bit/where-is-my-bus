import { TripRepository } from './trip.repository';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../errors';
import { Prisma } from '@prisma/client';

export class TripAssignmentEngine {
  private tripRepository = new TripRepository();

  async validateAssignment(
    organizationId: string,
    data: {
      vehicleId: string;
      driverId: string;
      routeId: string;
      scheduleId: string;
      serviceDate: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    // 1. Fetch related entities and organization to get timezone
    const [organization, vehicle, driver, route, schedule] = await Promise.all([
      db.organization.findUnique({ where: { organizationId } }),
      db.vehicle.findUnique({ where: { id: data.vehicleId, organizationId } }),
      db.user.findUnique({ where: { id: data.driverId, organizationId, role: 'DRIVER' } }),
      db.route.findUnique({ where: { id: data.routeId, organizationId, status: 'ACTIVE' } }),
      db.schedule.findUnique({ where: { id: data.scheduleId, organizationId, isActive: true } }),
    ]);

    if (!organization) throw new NotFoundError('Organization not found');
    if (!vehicle) throw new BadRequestError('Vehicle not found or does not belong to organization');
    if (!driver) throw new BadRequestError('Driver not found, invalid role, or does not belong to organization');
    if (!route) throw new BadRequestError('Route not found, inactive, or does not belong to organization');
    if (!schedule) throw new BadRequestError('Schedule not found, inactive, or does not belong to organization');
    if (schedule.routeId !== data.routeId) throw new BadRequestError('Schedule does not belong to the specified route');

    // 2. Validate Service Date (Cannot be in the past based on org timezone)
    const localToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: organization.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    if (data.serviceDate < localToday) {
      throw new BadRequestError(`Service date ${data.serviceDate} cannot be in the past. Today is ${localToday}`);
    }

    // 3. Driver Availability
    const driverTrip = await db.trip.findFirst({
      where: {
        driverId: data.driverId,
        serviceDate: data.serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
      },
    });
    if (driverTrip) {
      throw new BadRequestError(`Driver is already assigned to a trip on ${data.serviceDate}`);
    }

    // 4. Bus Availability
    const vehicleTrip = await db.trip.findFirst({
      where: {
        vehicleId: data.vehicleId,
        serviceDate: data.serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
      },
    });
    if (vehicleTrip) {
      throw new BadRequestError(`Vehicle is already assigned to a trip on ${data.serviceDate}`);
    }

    // 5. Schedule Uniqueness
    const scheduleTrip = await db.trip.findFirst({
      where: {
        scheduleId: data.scheduleId,
        serviceDate: data.serviceDate,
        organizationId,
        status: { not: 'CANCELLED' },
      },
    });
    if (scheduleTrip) {
      throw new BadRequestError(`A trip is already assigned for this schedule on ${data.serviceDate}`);
    }

    return true;
  }
}
