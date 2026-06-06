const prisma = require('../config/db');

// Retrieve students linked to the parent
exports.getLinkedStudents = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const students = await prisma.student.findMany({
      where: { parentId: req.user.id, institutionId: req.tenantId },
      include: {
        user: true,
        route: true,
        bus: true,
        attendance: {
          where: { date: todayStr },
        },
        routeStops: {
          where: {
            routeSchedule: {
              date: todayStr,
            },
          },
          include: {
            routeSchedule: true,
          },
        },
      },
    });

    // For each student, check if their bus has a running trip right now
    const augmentedStudents = await Promise.all(
      students.map(async (student) => {
        let activeTrip = null;
        if (student.busId) {
          activeTrip = await prisma.trip.findFirst({
            where: {
              busId: student.busId,
              status: 'RUNNING',
            },
            select: {
              id: true,
              startTime: true,
            },
          });
        }
        
        // Extract today's stop status
        const todayStop = student.routeStops.length > 0 ? student.routeStops[0] : null;

        return {
          ...student,
          activeTrip,
          todayStop,
        };
      })
    );

    res.json(augmentedStudents);
  } catch (error) {
    console.error('getLinkedStudents Error:', error);
    res.status(500).json({ error: 'Failed to retrieve linked students' });
  }
};

// Retrieve child's stop details from today's schedule
exports.getStudentStops = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const students = await prisma.student.findMany({
      where: { parentId: req.user.id, institutionId: req.tenantId },
    });

    const studentIds = students.map(s => s.id);
    const stops = await prisma.routeStop.findMany({
      where: {
        studentId: { in: studentIds },
        routeSchedule: {
          date: todayStr,
        },
      },
      include: {
        routeSchedule: {
          include: {
            route: true,
            bus: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(stops);
  } catch (error) {
    console.error('getStudentStops Error:', error);
    res.status(500).json({ error: 'Failed to retrieve stop details' });
  }
};

// Submit/Mark today's attendance check-in
exports.submitAttendance = async (req, res) => {
  try {
    const { studentId, requiresRide } = req.body;
    if (!studentId || requiresRide === undefined) {
      return res.status(400).json({ error: 'Student ID and ride requirement status are required' });
    }

    // 1. Verify student belongs to this parent
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId: req.user.id, institutionId: req.tenantId },
      include: {
        institution: true,
        user: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or access denied' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Validate Cutoff Time for Today's Attendance
    const cutoffTime = student.institution.cutoffTime; // e.g. "07:30"
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isCutoffPassed = currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute);

    if (isCutoffPassed) {
      return res.status(400).json({
        error: `Cutoff time (${cutoffTime}) for today's attendance has passed. Please contact the administrator.`,
      });
    }

    // 3. Upsert today's attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date: todayStr,
        },
      },
      update: {
        requiresRide,
        markedById: req.user.id,
      },
      create: {
        institutionId: req.tenantId,
        studentId,
        date: todayStr,
        requiresRide,
        markedById: req.user.id,
      },
    });

    res.json({
      message: `Attendance marked successfully. ${student.user.firstName} ${requiresRide ? 'will require' : 'will not require'} a ride today.`,
      attendance,
    });
  } catch (error) {
    console.error('submitAttendance Error:', error);
    res.status(500).json({ error: 'Failed to record attendance check-in' });
  }
};

// Retrieve notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, institutionId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(notifications);
  } catch (error) {
    console.error('getNotifications Error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationRead Error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Calculate basic/advanced ETA details
exports.getTripETA = async (req, res) => {
  try {
    const { id } = req.params; // Trip ID
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        route: true,
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!trip || trip.status !== 'RUNNING') {
      return res.status(404).json({ error: 'No active trip running' });
    }

    // Default simulation if no GPS logs have arrived yet
    let currentLat = trip.route.startLat;
    let currentLng = trip.route.startLng;

    if (trip.logs.length > 0) {
      currentLat = trip.logs[0].lat;
      currentLng = trip.logs[0].lng;
    }

    // Find the student pickup coordinates
    const student = await prisma.student.findFirst({
      where: {
        parentId: req.user.id,
        routeId: trip.routeId,
      },
    });

    if (!student) {
      return res.status(400).json({ error: 'Student not linked to this trip route' });
    }

    // Check if we have an ETACache entry for today's stop
    let etaCache = null;
    let routeProgress = 0;
    
    if (trip.routeScheduleId) {
      // Find today's stop for this student
      const stop = await prisma.routeStop.findFirst({
        where: {
          routeScheduleId: trip.routeScheduleId,
          studentId: student.id
        }
      });
      
      if (stop) {
        etaCache = await prisma.eTACache.findUnique({
          where: { routeStopId: stop.id }
        });
      }
      
      // Calculate route progress percentage (completed stops / total stops * 100)
      const totalStops = await prisma.routeStop.count({
        where: { routeScheduleId: trip.routeScheduleId }
      });
      
      const completedStops = await prisma.routeStop.count({
        where: {
          routeScheduleId: trip.routeScheduleId,
          status: { in: ['BOARDED', 'DEBOARDED', 'MISSED'] }
        }
      });
      
      routeProgress = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
    }

    if (etaCache) {
      const now = new Date();
      const predicted = new Date(etaCache.predictedArrival);
      const diffMs = predicted - now;
      const etaMinutes = Math.max(1, Math.round(diffMs / 60000));
      
      return res.json({
        tripId: trip.id,
        distanceKm: parseFloat(etaCache.distanceKm.toFixed(2)),
        etaMinutes,
        predictedArrival: etaCache.predictedArrival,
        routeProgress,
        currentBusLocation: { lat: currentLat, lng: currentLng },
        isRealTime: true
      });
    }

    // Spherical distance fallback from bus to student
    const R = 6371; // Earth's radius in km
    const dLat = (student.pickupLat - currentLat) * (Math.PI / 180);
    const dLon = (student.pickupLng - currentLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(currentLat * (Math.PI / 180)) *
        Math.cos(student.pickupLat * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const speedKmh = 35; 
    const etaMinutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));

    res.json({
      tripId: trip.id,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      etaMinutes,
      predictedArrival: new Date(Date.now() + etaMinutes * 60000),
      routeProgress,
      currentBusLocation: { lat: currentLat, lng: currentLng },
      isRealTime: false
    });
  } catch (error) {
    console.error('getTripETA Error:', error);
    res.status(500).json({ error: 'Failed to calculate ETA' });
  }
};

// Retrieve student's QR token
exports.getStudentQR = async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: { parentId: req.user.id, institutionId: req.tenantId },
      include: { qrCode: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not linked to this account' });
    }

    if (!student.qrCode) {
      // Auto-generate testing token if not found
      const token = `qr_token_${student.id.substring(0, 8)}`;
      const newQr = await prisma.studentQRCode.create({
        data: {
          studentId: student.id,
          qrToken: token
        }
      });
      return res.json({ qrToken: newQr.qrToken });
    }

    res.json({ qrToken: student.qrCode.qrToken });
  } catch (error) {
    console.error('getStudentQR Error:', error);
    res.status(500).json({ error: 'Failed to retrieve student QR token' });
  }
};

// Retrieve active emergencies and delay alerts affecting child's route
exports.getRouteEmergencies = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Find all students linked to the parent
    const students = await prisma.student.findMany({
      where: { parentId: req.user.id, institutionId: req.tenantId },
    });

    const routeIds = students.map(s => s.routeId).filter(Boolean);

    if (routeIds.length === 0) {
      return res.json({ emergencies: [], delays: [] });
    }

    // 2. Find active running trips on these routes
    const activeTrips = await prisma.trip.findMany({
      where: {
        routeId: { in: routeIds },
        status: 'RUNNING',
      },
    });

    const tripIds = activeTrips.map(t => t.id);

    if (tripIds.length === 0) {
      return res.json({ emergencies: [], delays: [] });
    }

    // 3. Query active emergencies
    const activeEmergencies = await prisma.emergencyEvent.findMany({
      where: {
        tripId: { in: tripIds },
        status: 'ACTIVE',
      },
      include: {
        bus: true,
        driver: {
          select: { firstName: true, lastName: true, phone: true }
        }
      },
    });

    // 4. Query today's delay reports
    const todayDelays = await prisma.delayReport.findMany({
      where: {
        tripId: { in: tripIds },
        createdAt: {
          gte: new Date(todayStr),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bus: true,
      },
    });

    res.json({
      emergencies: activeEmergencies,
      delays: todayDelays,
    });
  } catch (error) {
    console.error('getRouteEmergencies Error:', error);
    res.status(500).json({ error: 'Failed to retrieve route emergencies' });
  }
};
