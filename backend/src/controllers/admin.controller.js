const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { optimizeRoute } = require('../services/optimization');
const { getIo } = require('../services/socket');

// ==========================================
// BUS MANAGEMENT
// ==========================================

exports.getBuses = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      where: { institutionId: req.tenantId },
      include: { driver: true },
    });
    res.json(buses);
  } catch (error) {
    console.error('getBuses Error:', error);
    res.status(500).json({ error: 'Failed to retrieve buses' });
  }
};

exports.createBus = async (req, res) => {
  try {
    const { busNumber, licensePlate, capacity, driverId } = req.body;
    if (!busNumber || !licensePlate || !capacity) {
      return res.status(400).json({ error: 'Bus number, license plate, and capacity are required' });
    }

    if (driverId) {
      const driver = await prisma.user.findFirst({
        where: { id: driverId, institutionId: req.tenantId, role: 'DRIVER' }
      });
      if (!driver) {
        return res.status(400).json({ error: 'Assigned driver not found or belongs to another institution.' });
      }
    }

    const bus = await prisma.bus.create({
      data: {
        institutionId: req.tenantId,
        busNumber,
        licensePlate,
        capacity: parseInt(capacity),
        driverId: driverId || null,
        status: 'IDLE',
      },
    });
    res.status(201).json(bus);
  } catch (error) {
    console.error('createBus Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A bus with this number already exists in the institution' });
    }
    res.status(500).json({ error: 'Failed to create bus' });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { busNumber, licensePlate, capacity, driverId, status } = req.body;

    if (driverId && driverId !== '') {
      const driver = await prisma.user.findFirst({
        where: { id: driverId, institutionId: req.tenantId, role: 'DRIVER' }
      });
      if (!driver) {
        return res.status(400).json({ error: 'Assigned driver not found or belongs to another institution.' });
      }
    }

    const bus = await prisma.bus.update({
      where: { id, institutionId: req.tenantId },
      data: {
        busNumber,
        licensePlate,
        capacity: capacity ? parseInt(capacity) : undefined,
        driverId: driverId === '' ? null : driverId,
        status,
      },
    });
    res.json(bus);
  } catch (error) {
    console.error('updateBus Error:', error);
    res.status(500).json({ error: 'Failed to update bus' });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bus.delete({
      where: { id, institutionId: req.tenantId },
    });
    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('deleteBus Error:', error);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
};

// ==========================================
// ROUTE MANAGEMENT & SMART OPTIMIZATION
// ==========================================

exports.getRoutes = async (req, res) => {
  try {
    const routes = await prisma.route.findMany({
      where: { institutionId: req.tenantId },
      include: {
        students: {
          include: {
            user: true,
          },
        },
      },
    });
    res.json(routes);
  } catch (error) {
    console.error('getRoutes Error:', error);
    res.status(500).json({ error: 'Failed to retrieve routes' });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const { name, startLat, startLng, endLat, endLng } = req.body;
    if (!name || startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
      return res.status(400).json({ error: 'Route name and coordinates are required' });
    }

    const route = await prisma.route.create({
      data: {
        institutionId: req.tenantId,
        name,
        startLat: parseFloat(startLat),
        startLng: parseFloat(startLng),
        endLat: parseFloat(endLat),
        endLng: parseFloat(endLng),
      },
    });
    res.status(201).json(route);
  } catch (error) {
    console.error('createRoute Error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
};

// Smart Route Optimization trigger
exports.optimizeRouteStops = async (req, res) => {
  try {
    const { id } = req.params; // Route ID
    const todayStr = new Date().toISOString().split('T')[0];

    const route = await prisma.route.findFirst({
      where: { id, institutionId: req.tenantId },
      include: {
        students: {
          include: {
            user: true,
            attendance: {
              where: { date: todayStr },
            },
          },
        },
      },
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Filter students: Keep only those assigned to the route and marked present/requiresRide today
    const presentStudents = route.students.filter(student => {
      // If attendance wasn't marked, default to true or false. Here we default to present
      if (student.attendance.length === 0) return true;
      return student.attendance[0].requiresRide;
    });

    if (presentStudents.length === 0) {
      return res.json({
        message: 'No students require pickup today. Route optimized directly to destination.',
        optimizedStops: [],
        polyline: null,
      });
    }

    // Format start, stops, and end coordinates
    const startPoint = { lat: route.startLat, lng: route.startLng };
    const endPoint = { lat: route.endLat, lng: route.endLng };
    const stops = presentStudents.map(student => ({
      id: student.id,
      lat: student.pickupLat,
      lng: student.pickupLng,
      name: `${student.user?.firstName} ${student.user?.lastName}`,
      address: student.pickupAddress,
    }));

    // Run Traveling Salesman Solver
    const { optimizedStops, totalDistanceKm } = optimizeRoute(startPoint, stops, endPoint);

    // Save optimized order sequence to database for today's pickup
    await prisma.$transaction(
      optimizedStops.map(stop =>
        prisma.student.update({
          where: { id: stop.id },
          data: { sequenceOrder: stop.sequenceOrder },
        })
      )
    );

    // Formulate a simple direct path geometry string (connecting optimized nodes in order)
    const points = [
      [startPoint.lat, startPoint.lng],
      ...optimizedStops.map(s => [s.lat, s.lng]),
      [endPoint.lat, endPoint.lng]
    ];
    const polyline = JSON.stringify(points);

    await prisma.route.update({
      where: { id: route.id },
      data: { polyline },
    });

    res.json({
      message: `Route optimized successfully. Total distance: ${totalDistanceKm.toFixed(2)} km.`,
      distanceKm: totalDistanceKm,
      optimizedStops,
      polyline,
    });
  } catch (error) {
    console.error('optimizeRouteStops Error:', error);
    res.status(500).json({ error: 'Failed to optimize route stops' });
  }
};

// ==========================================
// STUDENT & PARENT MANAGEMENT
// ==========================================

exports.getStudents = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const students = await prisma.student.findMany({
      where: { institutionId: req.tenantId },
      include: {
        user: true,
        parent: true,
        route: true,
        bus: true,
        attendance: {
          where: { date: todayStr },
        },
      },
    });
    res.json(students);
  } catch (error) {
    console.error('getStudents Error:', error);
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password,
      parentEmail,
      parentFirstName,
      parentLastName,
      pickupLat,
      pickupLng,
      pickupAddress,
      routeId,
      busId,
    } = req.body;

    if (!email || !firstName || !lastName || !parentEmail || pickupLat === undefined || pickupLng === undefined) {
      return res.status(400).json({ error: 'Required fields missing: Student, Parent, or Coordinates.' });
    }

    const defaultPasswordHash = await bcrypt.hash(password || 'password123', 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or retrieve parent
      let parent = await tx.user.findUnique({ where: { email: parentEmail } });
      if (parent) {
        if (parent.institutionId !== req.tenantId) {
          throw new Error('PARENT_CROSS_TENANT');
        }
      } else {
        parent = await tx.user.create({
          data: {
            institutionId: req.tenantId,
            email: parentEmail,
            passwordHash: defaultPasswordHash,
            role: 'PARENT',
            firstName: parentFirstName || 'Parent',
            lastName: parentLastName || lastName,
          },
        });
      }

      if (routeId) {
        const route = await tx.route.findFirst({
          where: { id: routeId, institutionId: req.tenantId },
        });
        if (!route) {
          throw new Error('ROUTE_NOT_FOUND_OR_CROSS_TENANT');
        }
      }

      if (busId) {
        const bus = await tx.bus.findFirst({
          where: { id: busId, institutionId: req.tenantId },
        });
        if (!bus) {
          throw new Error('BUS_NOT_FOUND_OR_CROSS_TENANT');
        }
      }

      // 2. Create student user account
      const studentUser = await tx.user.create({
        data: {
          institutionId: req.tenantId,
          email,
          passwordHash: defaultPasswordHash,
          role: 'STUDENT',
          firstName,
          lastName,
        },
      });

      // 3. Create student profile
      const student = await tx.student.create({
        data: {
          institutionId: req.tenantId,
          userId: studentUser.id,
          parentId: parent.id,
          pickupLat: parseFloat(pickupLat),
          pickupLng: parseFloat(pickupLng),
          pickupAddress: pickupAddress || '',
          routeId: routeId || null,
          busId: busId || null,
        },
        include: {
          user: true,
          parent: true,
        },
      });

      return student;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('createStudent Error:', error);
    if (error.message === 'PARENT_CROSS_TENANT') {
      return res.status(400).json({ error: 'Parent email is registered under another institution.' });
    }
    if (error.message === 'ROUTE_NOT_FOUND_OR_CROSS_TENANT') {
      return res.status(400).json({ error: 'Assigned route not found in this institution.' });
    }
    if (error.message === 'BUS_NOT_FOUND_OR_CROSS_TENANT') {
      return res.status(400).json({ error: 'Assigned bus not found in this institution.' });
    }
    res.status(500).json({ error: 'Failed to create student profile' });
  }
};

// ==========================================
// ANALYTICS & DASHBOARD REPORTS
// ==========================================

exports.getAnalytics = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Count active buses (status EN_ROUTE or running active trips today)
    const activeBusesCount = await prisma.bus.count({
      where: {
        institutionId: req.tenantId,
        status: 'EN_ROUTE',
      },
    });

    // 2. Total buses in the institution
    const totalBuses = await prisma.bus.count({
      where: { institutionId: req.tenantId },
    });

    // 3. Daily Attendance rate
    const totalStudents = await prisma.student.count({
      where: { institutionId: req.tenantId },
    });

    const presentStudentsCount = await prisma.attendance.count({
      where: {
        institutionId: req.tenantId,
        date: todayStr,
        requiresRide: true,
      },
    });

    const absentStudentsCount = await prisma.attendance.count({
      where: {
        institutionId: req.tenantId,
        date: todayStr,
        requiresRide: false,
      },
    });

    const attendanceRate = totalStudents > 0 
      ? Math.round(((totalStudents - absentStudentsCount) / totalStudents) * 100) 
      : 100;

    // 4. Fuel-Saving Estimate
    // Every student absent avoids a pickup detour. We estimate that skipping 1 stop saves 1.8km on average,
    // which equates to approx 0.4 Gallons (or ~1.5 Liters) of diesel fuel saved.
    const averageGallonsSavedPerStop = 0.4;
    const dailyFuelSaved = absentStudentsCount * averageGallonsSavedPerStop;
    const monthlyFuelSaved = dailyFuelSaved * 22; // 22 school days in a month

    // 5. Active routes efficiency reporting
    const routes = await prisma.route.findMany({
      where: { institutionId: req.tenantId },
      include: {
        students: {
          include: {
            attendance: {
              where: { date: todayStr }
            }
          }
        }
      }
    });

    const routeReports = routes.map(r => {
      const assigned = r.students.length;
      const present = r.students.filter(s => s.attendance.length === 0 || s.attendance[0].requiresRide).length;
      const absent = assigned - present;
      return {
        id: r.id,
        name: r.name,
        assignedStudents: assigned,
        presentStudents: present,
        absentStudents: absent,
        optimizedDistanceKm: present > 0 ? (r.polyline ? 8.2 : 0) : 0, // default distance simulated or loaded
      };
    });

    res.json({
      metrics: {
        activeBuses: activeBusesCount,
        totalBuses,
        totalStudents,
        presentStudents: totalStudents - absentStudentsCount,
        absentStudents: absentStudentsCount,
        attendanceRate,
        fuelSavings: {
          todayGallons: parseFloat(dailyFuelSaved.toFixed(1)),
          monthGallons: parseFloat(monthlyFuelSaved.toFixed(1)),
        },
      },
      routesReport: routeReports,
    });
  } catch (error) {
    console.error('getAnalytics Error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
};

exports.getETAAnalytics = async (req, res) => {
  try {
    const histories = await prisma.tripHistory.findMany({
      where: { institutionId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const totalTrips = histories.length;
    const delayedTrips = histories.filter(h => h.onTimeStatus === 'DELAYED').length;
    const onTimeTrips = totalTrips - delayedTrips;

    const delayFrequency = totalTrips > 0 ? Math.round((delayedTrips / totalTrips) * 100) : 0;

    const totalDurationSum = histories.reduce((sum, h) => sum + h.totalDuration, 0);
    const averageRouteDuration = totalTrips > 0 ? Math.round(totalDurationSum / totalTrips) : 0;

    const speedSum = histories.reduce((sum, h) => sum + h.averageSpeed, 0);
    const averageSpeed = totalTrips > 0 ? parseFloat((speedSum / totalTrips).toFixed(2)) : 0;

    // Group by route
    const routeHistories = await prisma.tripHistory.groupBy({
      by: ['routeId'],
      where: { institutionId: req.tenantId },
      _avg: {
        totalDuration: true,
        averageSpeed: true,
      },
      _count: {
        id: true,
      },
    });

    const routeStats = await Promise.all(routeHistories.map(async (stat) => {
      const route = await prisma.route.findUnique({
        where: { id: stat.routeId },
        select: { name: true }
      });

      const routeDelays = await prisma.tripHistory.count({
        where: {
          routeId: stat.routeId,
          onTimeStatus: 'DELAYED'
        }
      });

      const count = stat._count.id;

      return {
        routeId: stat.routeId,
        routeName: route ? route.name : 'Unknown Route',
        averageDuration: stat._avg.totalDuration ? Math.round(stat._avg.totalDuration) : 0,
        averageSpeed: stat._avg.averageSpeed ? parseFloat(stat._avg.averageSpeed.toFixed(2)) : 0,
        tripCount: count,
        delayRate: count > 0 ? Math.round((routeDelays / count) * 100) : 0
      };
    }));

    // Historical list of logs
    const historyLogs = histories.map(h => ({
      id: h.id,
      date: h.date,
      totalDuration: h.totalDuration,
      averageSpeed: h.averageSpeed,
      onTimeStatus: h.onTimeStatus,
    }));

    res.json({
      averageRouteDuration,
      delayFrequency,
      totalTrips,
      onTimeTrips,
      delayedTrips,
      averageSpeed,
      routeStats,
      historyLogs
    });
  } catch (error) {
    console.error('getETAAnalytics Error:', error);
    res.status(500).json({ error: 'Failed to retrieve ETA analytics' });
  }
};

// Generate today's RouteSchedules & RouteStops for all active routes
exports.generateDailySchedules = async (req, res) => {
  try {
    const todayStr = req.body.date || new Date().toISOString().split('T')[0];

    // Find all routes for this tenant
    const routes = await prisma.route.findMany({
      where: { institutionId: req.tenantId },
      include: {
        students: {
          include: {
            user: true,
            attendance: {
              where: { date: todayStr },
            },
            bus: true,
          },
        },
      },
    });

    const generatedSchedules = [];

    for (const route of routes) {
      // 1. Delete existing schedule for this route on this date to allow overwrite
      const existing = await prisma.routeSchedule.findFirst({
        where: { routeId: route.id, date: todayStr },
      });
      if (existing) {
        await prisma.routeSchedule.delete({ where: { id: existing.id } });
      }

      // 2. Filter students present/requiresRide today
      const presentStudents = route.students.filter(student => {
        if (student.attendance.length === 0) return true; // Default to present if unmarked
        return student.attendance[0].requiresRide;
      });

      if (presentStudents.length === 0) continue;

      // 3. Resolve bus and driver (use from first present student)
      const busId = presentStudents[0].busId;
      const driverId = presentStudents[0].bus?.driverId || null;

      // 4. Run TSP optimization
      const startPoint = { lat: route.startLat, lng: route.startLng };
      const endPoint = { lat: route.endLat, lng: route.endLng };
      const stops = presentStudents.map(student => ({
        id: student.id,
        lat: student.pickupLat,
        lng: student.pickupLng,
        name: `${student.user?.firstName} ${student.user?.lastName}`,
        address: student.pickupAddress,
      }));

      const { optimizedStops, totalDistanceKm } = optimizeRoute(startPoint, stops, endPoint);

      // 5. Create RouteSchedule and RouteStops in a transaction
      const schedule = await prisma.routeSchedule.create({
        data: {
          institutionId: req.tenantId,
          routeId: route.id,
          busId,
          driverId,
          date: todayStr,
          status: 'SCHEDULED',
          stops: {
            create: optimizedStops.map(stop => ({
              studentId: stop.id,
              sequenceOrder: stop.sequenceOrder,
              lat: stop.lat,
              lng: stop.lng,
              address: stop.address,
              status: 'PENDING',
            })),
          },
        },
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
      });

      // Update polyline on route
      const points = [
        [startPoint.lat, startPoint.lng],
        ...optimizedStops.map(s => [s.lat, s.lng]),
        [endPoint.lat, endPoint.lng]
      ];
      await prisma.route.update({
        where: { id: route.id },
        data: { polyline: JSON.stringify(points) },
      });

      generatedSchedules.push(schedule);
    }

    res.json({
      message: `Successfully generated ${generatedSchedules.length} schedules for ${todayStr}`,
      schedules: generatedSchedules,
    });
  } catch (error) {
    console.error('generateDailySchedules Error:', error);
    res.status(500).json({ error: 'Failed to generate daily schedules' });
  }
};

// Retrieve today's schedules
exports.getTodaySchedules = async (req, res) => {
  try {
    const todayStr = req.query.date || new Date().toISOString().split('T')[0];
    const schedules = await prisma.routeSchedule.findMany({
      where: { institutionId: req.tenantId, date: todayStr },
      include: {
        route: true,
        bus: true,
        driver: true,
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
    });
    res.json(schedules);
  } catch (error) {
    console.error('getTodaySchedules Error:', error);
    res.status(500).json({ error: 'Failed to retrieve today\'s schedules' });
  }
};

exports.getActiveEmergencies = async (req, res) => {
  try {
    const active = await prisma.emergencyEvent.findMany({
      where: { institutionId: req.tenantId, status: 'ACTIVE' },
      include: {
        bus: true,
        driver: true,
        trip: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(active);
  } catch (error) {
    console.error('getActiveEmergencies Error:', error);
    res.status(500).json({ error: 'Failed to retrieve active emergencies' });
  }
};

exports.resolveEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const event = await prisma.emergencyEvent.findUnique({
      where: { id },
      include: { bus: true, driver: true }
    });

    if (!event || event.institutionId !== req.tenantId) {
      return res.status(404).json({ error: 'Emergency event not found' });
    }

    const updated = await prisma.emergencyEvent.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        description: event.description ? `${event.description} | Resolved: ${description || 'No notes'}` : `Resolved: ${description || 'No notes'}`
      }
    });

    const title = `RESOLVED: Emergency on Bus #${event.bus.busNumber}`;
    const message = `The emergency event (${event.type}) has been resolved. Notes: ${description || 'No resolution notes provided.'}`;

    let parentIds = [];
    if (event.tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: event.tripId }
      });
      if (trip) {
        if (trip.routeScheduleId) {
          const stops = await prisma.routeStop.findMany({
            where: { routeScheduleId: trip.routeScheduleId },
            include: { student: true }
          });
          parentIds = [...new Set(stops.map(s => s.student.parentId).filter(Boolean))];
        } else {
          const routeStudents = await prisma.student.findMany({
            where: { routeId: trip.routeId, institutionId: req.tenantId },
          });
          parentIds = [...new Set(routeStudents.map(s => s.parentId).filter(Boolean))];
        }
      }
    }

    for (const parentId of parentIds) {
      await prisma.emergencyNotification.create({
        data: {
          institutionId: req.tenantId,
          userId: parentId,
          eventId: event.id,
          title,
          message
        }
      });
    }

    // Broadcast via socket
    const io = getIo();
    if (io) {
      if (event.tripId) {
        io.to(`trip:${event.tripId}`).emit('emergency-resolved', {
          eventId: event.id,
          status: 'RESOLVED',
          message
        });
      }
      io.to(`admin:active-buses:${event.institutionId}`).emit('bus-emergency-resolved', {
        busId: event.busId,
        eventId: event.id,
        status: 'RESOLVED'
      });
      for (const parentId of parentIds) {
        io.to(`user:${parentId}`).emit(`notification:${parentId}`, { title, message, type: 'EMERGENCY_RESOLVED' });
      }
    }

    res.json({ message: 'Emergency resolved successfully', event: updated });
  } catch (error) {
    console.error('resolveEmergency Error:', error);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
};

exports.getEmergencyAnalytics = async (req, res) => {
  try {
    const emergencies = await prisma.emergencyEvent.findMany({
      where: { institutionId: req.tenantId }
    });

    const counts = {
      SOS: emergencies.filter(e => e.type === 'SOS').length,
      BREAKDOWN: emergencies.filter(e => e.type === 'BREAKDOWN').length,
      MEDICAL: emergencies.filter(e => e.type === 'MEDICAL').length,
      TRAFFIC: emergencies.filter(e => e.type === 'TRAFFIC').length,
      OBSTRUCTION: emergencies.filter(e => e.type === 'OBSTRUCTION').length,
      total: emergencies.length
    };

    const delays = await prisma.delayReport.findMany({
      where: { institutionId: req.tenantId }
    });

    const totalDelayMins = delays.reduce((acc, d) => acc + d.estimatedDelayMins, 0);
    const avgDelayMins = delays.length > 0 ? parseFloat((totalDelayMins / delays.length).toFixed(1)) : 0;

    const delayReasons = {
      TRAFFIC: delays.filter(d => d.reason === 'TRAFFIC').length,
      OBSTRUCTION: delays.filter(d => d.reason === 'OBSTRUCTION').length,
      BREAKDOWN: delays.filter(d => d.reason === 'BREAKDOWN').length,
      MEDICAL: delays.filter(d => d.reason === 'MEDICAL').length,
      OTHER: delays.filter(d => d.reason === 'OTHER').length,
      total: delays.length
    };

    const resolvedEmergencies = emergencies.filter(e => e.status === 'RESOLVED' && e.resolvedAt);
    let totalResolutionMs = 0;
    for (const e of resolvedEmergencies) {
      totalResolutionMs += new Date(e.resolvedAt).getTime() - new Date(e.createdAt).getTime();
    }
    const avgResolutionMins = resolvedEmergencies.length > 0 
      ? Math.round((totalResolutionMs / resolvedEmergencies.length) / 60000) 
      : 0;

    res.json({
      counts,
      delayMetrics: {
        totalDelayReports: delays.length,
        averageDelayMins: avgDelayMins,
        reasons: delayReasons
      },
      avgResolutionMins,
      resolvedCount: resolvedEmergencies.length,
      activeCount: emergencies.filter(e => e.status === 'ACTIVE').length
    });
  } catch (error) {
    console.error('getEmergencyAnalytics Error:', error);
    res.status(500).json({ error: 'Failed to retrieve emergency analytics' });
  }
};

