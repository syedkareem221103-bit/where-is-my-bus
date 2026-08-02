import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RouteReplayService {
  /**
   * Fetch downsampled trip pings for historical replay (max 500 pings per trip)
   */
  public static async getTripReplay(organizationId: string, tripId: string) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, organizationId },
      include: {
        pings: {
          orderBy: { timestamp: 'asc' }
        },
        route: true,
        vehicle: true,
        driver: true
      }
    });

    if (!trip) {
      throw new Error('Trip not found or access denied');
    }

    let pings = trip.pings;

    // Downsample if over 500 pings
    if (pings.length > 500) {
      const step = Math.ceil(pings.length / 500);
      pings = pings.filter((_, index) => index % step === 0);
    }

    return {
      tripId: trip.id,
      routeId: trip.routeId,
      routeName: trip.route.name,
      vehicleNumber: trip.vehicle.registrationNo,
      driverName: `${trip.driver.firstName} ${trip.driver.lastName}`,
      startTime: trip.createdAt,
      endTime: trip.updatedAt,
      pings: pings.map(p => ({
        lat: p.latitude,
        lng: p.longitude,
        speed: p.speed,
        timestamp: p.timestamp
      }))
    };
  }
}
