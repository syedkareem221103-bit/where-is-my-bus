const prisma = require('../config/db');
const { haversineDistance } = require('./optimization');

/**
 * Retrieves the average speed coefficient (in km/h) from TripHistory for a given route.
 * Falls back to 35 km/h if no history is available.
 */
async function getHistoricalSpeed(routeId) {
  try {
    const history = await prisma.tripHistory.findMany({
      where: { routeId },
      select: { averageSpeed: true },
    });

    if (history.length === 0) {
      return 35.0; // default baseline speed
    }

    const sum = history.reduce((acc, curr) => acc + curr.averageSpeed, 0);
    const avg = sum / history.length;
    return avg > 5 ? avg : 35.0; // avoid ridiculously low speeds
  } catch (error) {
    console.error('Error in getHistoricalSpeed:', error);
    return 35.0;
  }
}

/**
 * Calculates and caches ETAs for all unvisited stops on an active trip.
 * Updates the ETACache table.
 */
async function calculateAndCacheETAs(tripId, currentLat, currentLng) {
  try {
    // 1. Fetch trip and its stops
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        routeSchedule: {
          include: {
            stops: {
              orderBy: { sequenceOrder: 'asc' },
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trip || !trip.routeSchedule) {
      console.warn(`Trip ${tripId} or its schedule not found.`);
      return [];
    }

    const stops = trip.routeSchedule.stops;
    const pendingStops = stops.filter(s => s.status === 'PENDING');

    if (pendingStops.length === 0) {
      return [];
    }

    // 2. Fetch speed coefficient
    const speedKmh = await getHistoricalSpeed(trip.routeId);
    const speedKmPerMin = speedKmh / 60.0;

    // 3. Cascade calculation through upcoming stops
    let currentPosition = { lat: currentLat, lng: currentLng };
    let cumulativeDistance = 0;
    const results = [];
    const upsertOperations = [];
    const dwellTimePerStopMin = 1.0; // 1 minute dwell time per stop

    for (let i = 0; i < pendingStops.length; i++) {
      const stop = pendingStops[i];
      const distToStop = haversineDistance(
        currentPosition.lat,
        currentPosition.lng,
        stop.lat,
        stop.lng
      );

      cumulativeDistance += distToStop;

      // Calculate travel time
      const travelTimeMinutes = cumulativeDistance / speedKmPerMin;
      // Add dwell times for intermediate stops (1 minute for each stop prior to this one)
      const totalDwellMinutes = i * dwellTimePerStopMin;
      const totalTimeMinutes = travelTimeMinutes + totalDwellMinutes;

      const predictedArrival = new Date(Date.now() + totalTimeMinutes * 60000);

      // Collect operations for transaction batch write
      upsertOperations.push(
        prisma.eTACache.upsert({
          where: { routeStopId: stop.id },
          update: {
            tripId,
            predictedArrival,
            distanceKm: parseFloat(cumulativeDistance.toFixed(3)),
          },
          create: {
            tripId,
            routeStopId: stop.id,
            predictedArrival,
            distanceKm: parseFloat(cumulativeDistance.toFixed(3)),
          },
        })
      );

      results.push({
        routeStopId: stop.id,
        studentId: stop.studentId,
        studentName: `${stop.student.user?.firstName || ''} ${stop.student.user?.lastName || ''}`.trim(),
        parentId: stop.student.parentId,
        predictedArrival,
        distanceKm: parseFloat(cumulativeDistance.toFixed(2)),
        etaMinutes: Math.max(1, Math.round(totalTimeMinutes)),
      });

      // Move virtual pointer to this stop for the next stop calculation
      currentPosition = { lat: stop.lat, lng: stop.lng };
    }

    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations);
    }

    return results;
  } catch (error) {
    console.error('Error in calculateAndCacheETAs:', error);
    return [];
  }
}

module.exports = {
  getHistoricalSpeed,
  calculateAndCacheETAs,
};
