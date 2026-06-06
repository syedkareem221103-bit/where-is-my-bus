const { Server } = require('socket.io');
const prisma = require('../config/db');
const { haversineDistance } = require('./optimization');
const { calculateAndCacheETAs } = require('./eta');

let io = null;

async function triggerEtaAlert(institutionId, parentId, studentName, threshold, etaMinutes, distanceKm, todayStr) {
  const typeMap = {
    10: 'ETA_10M',
    5: 'ETA_5M',
    0: 'ETA_ARRIVING'
  };
  const type = typeMap[threshold];

  // Check if already sent today
  const existing = await prisma.notification.findFirst({
    where: {
      userId: parentId,
      type,
      createdAt: {
        gte: new Date(todayStr)
      }
    }
  });

  if (!existing) {
    let title = '';
    let message = '';
    if (threshold === 10) {
      title = 'Bus Approaching (10m)';
      message = `The bus is approximately 10 minutes away (${etaMinutes} mins, ${distanceKm.toFixed(2)} km) from ${studentName}'s pickup point.`;
    } else if (threshold === 5) {
      title = 'Bus Approaching (5m)';
      message = `The bus is approximately 5 minutes away (${etaMinutes} mins, ${distanceKm.toFixed(2)} km) from ${studentName}'s pickup point. Please get ready!`;
    } else {
      title = 'Bus Arriving Now';
      message = `The bus is arriving now at ${studentName}'s pickup point!`;
    }

    const notif = await prisma.notification.create({
      data: {
        institutionId,
        userId: parentId,
        title,
        message,
        type,
      }
    });

    if (io) {
      io.to(`user:${parentId}`).emit(`notification:${parentId}`, notif);
      console.log(`Alert trigger: Sent ${type} alert to parent ${parentId}`);
    }
  }
}

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');

  // Connection-level authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.email})`);

    // Join private room for targeted notification routing
    if (socket.user && socket.user.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join a room for a specific active trip
    socket.on('join-trip', async ({ tripId }) => {
      if (!socket.user) return;
      try {
        const trip = await prisma.trip.findUnique({
          where: { id: tripId },
          include: { route: true }
        });
        if (!trip) return;

        const role = socket.user.role;
        const tenantId = socket.user.institutionId;

        let authorized = false;
        if (role === 'SUPER_ADMIN') {
          authorized = true;
        } else if (role === 'INST_ADMIN') {
          authorized = trip.institutionId === tenantId;
        } else if (role === 'DRIVER') {
          authorized = trip.driverId === socket.user.id;
        } else if (role === 'PARENT' || role === 'STUDENT') {
          if (role === 'STUDENT') {
            const student = await prisma.student.findFirst({
              where: { userId: socket.user.id, routeId: trip.routeId }
            });
            authorized = !!student;
          } else {
            const student = await prisma.student.findFirst({
              where: { parentId: socket.user.id, routeId: trip.routeId }
            });
            authorized = !!student;
          }
        }

        if (authorized) {
          socket.join(`trip:${tripId}`);
          console.log(`Socket ${socket.id} joined trip room: trip:${tripId}`);
        } else {
          console.warn(`Unauthorized join-trip attempt by user ${socket.user.id} on trip ${tripId}`);
        }
      } catch (err) {
        console.error('join-trip authorization error:', err);
      }
    });

    // Leave trip room
    socket.on('leave-trip', ({ tripId }) => {
      socket.leave(`trip:${tripId}`);
      console.log(`Socket ${socket.id} left trip room: trip:${tripId}`);
    });

    // Join/leave global admin tracking room (tenant-scoped)
    socket.on('join-admin-tracker', () => {
      if (!socket.user) return;
      const role = socket.user.role;
      if (role === 'SUPER_ADMIN') {
        socket.join('admin:active-buses');
        console.log(`Super Admin ${socket.id} joined global admin tracker`);
      } else if (role === 'INST_ADMIN') {
        socket.join(`admin:active-buses:${socket.user.institutionId}`);
        console.log(`Admin ${socket.id} joined scoped admin tracker: admin:active-buses:${socket.user.institutionId}`);
      }
    });

    socket.on('leave-admin-tracker', () => {
      if (!socket.user) return;
      const role = socket.user.role;
      if (role === 'SUPER_ADMIN') {
        socket.leave('admin:active-buses');
      } else if (role === 'INST_ADMIN') {
        socket.leave(`admin:active-buses:${socket.user.institutionId}`);
      }
    });

    // Driver broadcasts GPS update
    socket.on('gps-update', async (data) => {
      const { tripId, lat, lng, speed, bearing } = data;
      if (!tripId || lat === undefined || lng === undefined) return;
      if (!socket.user) return;

      try {
        const trip = await prisma.trip.findUnique({
          where: { id: tripId },
          include: { bus: true }
        });

        if (!trip || trip.status !== 'RUNNING') return;

        // GPS Sender Validation
        if (socket.user.role !== 'DRIVER' || socket.user.id !== trip.driverId) {
          console.warn(`Unauthorized GPS update attempt on trip ${tripId} by user ${socket.user.id}`);
          return;
        }

        console.log(`GPS Update [Trip ${tripId}]: Lat ${lat}, Lng ${lng}, Speed ${speed || 0} km/h`);

        // Broadcast position to all connected listeners in the trip room (parents, admins)
        io.to(`trip:${tripId}`).emit('location-changed', {
          lat,
          lng,
          speed: speed || 0,
          bearing: bearing || 0,
          timestamp: new Date(),
        });

        // Save the GPS log asynchronously to SQLite
        await prisma.tripLog.create({
          data: {
            tripId,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            speed: speed ? parseFloat(speed) : null,
            bearing: bearing ? parseFloat(bearing) : null,
          },
        });

        // Cache the latest position in the Bus model
        await prisma.bus.update({
          where: { id: trip.busId },
          data: {
            lastLat: parseFloat(lat),
            lastLng: parseFloat(lng),
            lastSpeed: speed ? parseFloat(speed) : null,
            lastHeading: bearing ? parseFloat(bearing) : null,
            lastUpdated: new Date()
          }
        });

        const updatePayload = {
          busId: trip.busId,
          busNumber: trip.bus.busNumber,
          licensePlate: trip.bus.licensePlate,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          speed: speed ? parseFloat(speed) : 0,
          bearing: bearing ? parseFloat(bearing) : 0,
          timestamp: new Date()
        };

        // Broadcast to scoped admin tracking room
        io.to(`admin:active-buses:${trip.institutionId}`).emit('bus-location-changed', updatePayload);
        // Also emit to global admin room for SUPER_ADMINs
        io.to('admin:active-buses').emit('bus-location-changed', updatePayload);

        // 3a. Calculate and Cache ETAs, then broadcast to trip room
        const etaResults = await calculateAndCacheETAs(tripId, parseFloat(lat), parseFloat(lng));
        io.to(`trip:${tripId}`).emit('eta-updates', etaResults);

        // 3b. Trigger Alert Thresholds (10m, 5m, arriving now)
        const todayStrVal = new Date().toISOString().split('T')[0];
        for (const resVal of etaResults) {
          const { parentId, studentName, etaMinutes, distanceKm } = resVal;
          if (!parentId) continue;

          if (etaMinutes <= 10) {
            await triggerEtaAlert(trip.institutionId, parentId, studentName, 10, etaMinutes, distanceKm, todayStrVal);
          }
          if (etaMinutes <= 5) {
            await triggerEtaAlert(trip.institutionId, parentId, studentName, 5, etaMinutes, distanceKm, todayStrVal);
          }
          if (etaMinutes <= 1 || distanceKm <= 0.15) {
            await triggerEtaAlert(trip.institutionId, parentId, studentName, 0, etaMinutes, distanceKm, todayStrVal);
          }
        }

        // 4. Proximity detection check
        const presentStudents = await prisma.student.findMany({
          where: {
            routeId: trip.routeId,
            attendance: {
              some: {
                date: new Date().toISOString().split('T')[0],
                requiresRide: true,
              },
            },
          },
          include: {
            user: true,
          },
        });

        if (presentStudents.length > 0) {
          const proximityRadiusKm = 0.5; // Notify parent if bus is within 500 meters
          
          for (const student of presentStudents) {
            const distance = haversineDistance(lat, lng, student.pickupLat, student.pickupLng);
            
            if (distance <= proximityRadiusKm) {
              const todayStr = new Date().toISOString().split('T')[0];
              const parentId = student.parentId;

              if (parentId) {
                const existingNotif = await prisma.notification.findFirst({
                  where: {
                    userId: parentId,
                    type: 'BUS_APPROACHING',
                    createdAt: {
                      gte: new Date(todayStr),
                    },
                  },
                });

                // If not sent, send a notification
                if (!existingNotif) {
                  const title = 'Bus Approaching!';
                  const message = `The bus is less than 500m away from ${student.user?.firstName || 'your student'}'s pickup spot!`;

                  const notif = await prisma.notification.create({
                    data: {
                      institutionId: trip.institutionId,
                      userId: parentId,
                      title,
                      message,
                      type: 'BUS_APPROACHING',
                    },
                  });

                  // Emit notification selectively to parent private room
                  io.to(`user:${parentId}`).emit(`notification:${parentId}`, notif);
                  console.log(`Proximity Alert: Sent notification to parent ${parentId}`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error saving GPS log or updating bus cache:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  return io;
};

module.exports = {
  initSocket,
  getIo,
};
