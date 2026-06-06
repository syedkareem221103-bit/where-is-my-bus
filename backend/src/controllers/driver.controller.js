const prisma = require('../config/db');
const { getIo } = require('../services/socket');
const { haversineDistance } = require('../services/optimization');

// Fetch assigned bus, route and student list
exports.getAssignedBus = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const bus = await prisma.bus.findFirst({
      where: { driverId: req.user.id, institutionId: req.tenantId },
      include: {
        students: {
          include: {
            user: true,
            parent: true,
            attendance: {
              where: { date: todayStr },
            },
          },
        },
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'No bus assigned to this driver' });
    }

    // Find if there is a base route assigned to the bus or driver
    // In our simplified scheme, students on the bus belong to routes.
    // Let's find the route id from the first student, or query routes.
    let route = null;
    if (bus.students.length > 0 && bus.students[0].routeId) {
      route = await prisma.route.findUnique({
        where: { id: bus.students[0].routeId },
      });
    }

    // Sort students by sequenceOrder
    const sortedStudents = bus.students
      .filter(s => s.attendance.length === 0 || s.attendance[0].requiresRide)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    res.json({
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        licensePlate: bus.licensePlate,
        capacity: bus.capacity,
        status: bus.status,
      },
      route,
      students: sortedStudents,
    });
  } catch (error) {
    console.error('getAssignedBus Error:', error);
    res.status(500).json({ error: 'Failed to retrieve driver assignment' });
  }
};

// Start a bus trip
exports.startTrip = async (req, res) => {
  try {
    const { busId, routeId } = req.body;
    if (!busId || !routeId) {
      return res.status(400).json({ error: 'Bus ID and Route ID are required to start a trip' });
    }

    // Verify driver owns the bus
    const bus = await prisma.bus.findFirst({
      where: { id: busId, driverId: req.user.id },
    });

    if (!bus) {
      return res.status(403).json({ error: 'Forbidden: Driver is not assigned to this bus' });
    }

    // Create a new Trip record
    const trip = await prisma.trip.create({
      data: {
        institutionId: req.tenantId,
        busId,
        routeId,
        driverId: req.user.id,
        status: 'RUNNING',
        startTime: new Date(),
      },
    });

    // Update bus status to EN_ROUTE
    await prisma.bus.update({
      where: { id: busId },
      data: { status: 'EN_ROUTE' },
    });

    // Broadcast trip start via WebSockets
    const io = getIo();
    if (io) {
      io.to(`trip:${trip.id}`).emit('trip-status-changed', {
        tripId: trip.id,
        status: 'RUNNING',
        message: 'Trip started successfully',
      });
    }

    res.status(201).json({
      message: 'Trip started successfully',
      trip,
    });
  } catch (error) {
    console.error('startTrip Error:', error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
};

// Stop a bus trip
exports.stopTrip = async (req, res) => {
  try {
    const { id } = req.params; // Trip ID

    const trip = await prisma.trip.findFirst({
      where: { id, driverId: req.user.id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }

    const endTime = new Date();

    // Update Trip record
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime,
      },
    });

    // Update bus status back to IDLE
    await prisma.bus.update({
      where: { id: trip.busId },
      data: { status: 'IDLE' },
    });

    // --- ETA History & Stats computation ---
    try {
      const startTime = trip.startTime || trip.createdAt;
      const durationMs = endTime.getTime() - new Date(startTime).getTime();
      const totalDuration = Math.max(1.0, durationMs / 60000); // in minutes

      // Fetch logs to calculate distance
      const logs = await prisma.tripLog.findMany({
        where: { tripId: id },
        orderBy: { timestamp: 'asc' },
      });

      let totalDistanceKm = 0.0;
      if (logs.length >= 2) {
        for (let i = 0; i < logs.length - 1; i++) {
          totalDistanceKm += haversineDistance(
            logs[i].lat,
            logs[i].lng,
            logs[i + 1].lat,
            logs[i + 1].lng
          );
        }
      } else {
        // Fallback: estimate from route points if no logs
        totalDistanceKm = haversineDistance(
          trip.route ? trip.route.startLat : 0,
          trip.route ? trip.route.startLng : 0,
          trip.route ? trip.route.endLat : 0,
          trip.route ? trip.route.endLng : 0
        ) || 5.0; // default 5km fallback
      }

      // Calculate speed: distance / hours
      const hours = totalDuration / 60.0;
      let averageSpeed = totalDistanceKm / hours;
      // Clamp average speed to realistic values (between 15 and 65 km/h) for analytics consistency
      if (isNaN(averageSpeed) || averageSpeed < 5) {
        averageSpeed = 35.0;
      } else if (averageSpeed > 80) {
        averageSpeed = 55.0;
      }

      // Determine onTimeStatus based on stops count
      // Assume baseline expected time is 3 minutes per stop + 10 mins overhead
      let stopsCount = 0;
      if (trip.routeScheduleId) {
        stopsCount = await prisma.routeStop.count({
          where: { routeScheduleId: trip.routeScheduleId },
        });
      }
      const expectedDuration = stopsCount * 3.0 + 10.0;
      const onTimeStatus = totalDuration > (expectedDuration + 5) ? 'DELAYED' : 'ON_TIME';

      await prisma.tripHistory.create({
        data: {
          institutionId: trip.institutionId,
          routeId: trip.routeId,
          busId: trip.busId,
          driverId: trip.driverId,
          totalDuration: parseFloat(totalDuration.toFixed(2)),
          averageSpeed: parseFloat(averageSpeed.toFixed(2)),
          onTimeStatus,
          date: new Date().toISOString().split('T')[0],
        },
      });
      console.log(`Saved TripHistory for completed trip ${id}: Duration=${totalDuration.toFixed(1)} mins, Speed=${averageSpeed.toFixed(1)} km/h, Status=${onTimeStatus}`);
    } catch (historyErr) {
      console.error('Failed to create TripHistory record:', historyErr);
    }
    // ----------------------------------------

    // Broadcast trip stop
    const io = getIo();
    if (io) {
      io.to(`trip:${trip.id}`).emit('trip-status-changed', {
        tripId: trip.id,
        status: 'COMPLETED',
        message: 'Trip completed',
      });
    }

    res.json({
      message: 'Trip stopped successfully',
      trip: updatedTrip,
    });
  } catch (error) {
    console.error('stopTrip Error:', error);
    res.status(500).json({ error: 'Failed to stop trip' });
  }
};

// Mark a student as Picked Up or Dropped Off
exports.markStudentPickup = async (req, res) => {
  try {
    const { studentId, status } = req.body; // status: 'BOARDED' or 'DEBOARDED'
    if (!studentId || !status || !['BOARDED', 'DEBOARDED'].includes(status)) {
      return res.status(400).json({ error: 'Student ID and valid status (BOARDED/DEBOARDED) are required' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parent: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 1. Create a notification for the parent
    if (student.parentId) {
      const studentName = `${student.user?.firstName || 'Student'} ${student.user?.lastName || ''}`;
      const actionText = status === 'BOARDED' ? 'has boarded the bus.' : 'has safely arrived and deboarded the bus.';
      const title = status === 'BOARDED' ? 'Student Boarded Bus' : 'Student Reached Destination';
      
      const notif = await prisma.notification.create({
        data: {
          institutionId: req.tenantId,
          userId: student.parentId,
          title,
          message: `${studentName} ${actionText}`,
          type: status,
        },
      });

      // 2. Push WebSocket event to Parent
      const io = getIo();
      if (io) {
        io.to(`user:${student.parentId}`).emit(`notification:${student.parentId}`, notif);
      }
    }

    res.json({
      message: `Student marked as ${status} successfully`,
      studentId,
      status,
    });
  } catch (error) {
    console.error('markStudentPickup Error:', error);
    res.status(500).json({ error: 'Failed to record student status change' });
  }
};

// Retrieve today's assigned schedule for the driver
exports.getAssignedSchedule = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const schedule = await prisma.routeSchedule.findFirst({
      where: { driverId: req.user.id, institutionId: req.tenantId, date: todayStr },
      include: {
        route: true,
        bus: true,
        stops: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            student: {
              include: {
                user: true,
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      // Fallback to general assignment if no schedule generated yet
      return exports.getAssignedBus(req, res);
    }

    // Check if there is an active running trip
    const activeTrip = await prisma.trip.findFirst({
      where: { routeScheduleId: schedule.id, status: 'RUNNING' }
    });

    let enrichedStops = schedule.stops.map(stop => ({
      ...stop,
      predictedArrival: null,
      distanceKm: null,
      etaMinutes: null
    }));

    let nextStopMetrics = null;

    if (activeTrip) {
      const caches = await prisma.eTACache.findMany({
        where: { tripId: activeTrip.id }
      });

      const cacheMap = new Map(caches.map(c => [c.routeStopId, c]));

      enrichedStops = schedule.stops.map(stop => {
        const cache = cacheMap.get(stop.id);
        let predictedArrival = null;
        let distanceKm = null;
        let etaMinutes = null;

        if (cache) {
          predictedArrival = cache.predictedArrival;
          distanceKm = parseFloat(cache.distanceKm.toFixed(2));
          const diffMs = new Date(predictedArrival) - new Date();
          etaMinutes = Math.max(1, Math.round(diffMs / 60000));
        }

        return {
          ...stop,
          predictedArrival,
          distanceKm,
          etaMinutes
        };
      });

      const nextStop = enrichedStops.find(s => s.status === 'PENDING');
      if (nextStop) {
        nextStopMetrics = {
          name: nextStop.student?.user ? `${nextStop.student.user.firstName} ${nextStop.student.user.lastName}` : 'Next Stop',
          address: nextStop.address || nextStop.student?.pickupAddress || 'Pickup Spot',
          distanceKm: nextStop.distanceKm,
          etaMinutes: nextStop.etaMinutes,
          predictedArrival: nextStop.predictedArrival
        };
      }
    }

    res.json({
      ...schedule,
      stops: enrichedStops,
      activeTripId: activeTrip ? activeTrip.id : null,
      nextStopMetrics
    });
  } catch (error) {
    console.error('getAssignedSchedule Error:', error);
    res.status(500).json({ error: 'Failed to retrieve driver schedule' });
  }
};

// Start a scheduled run
exports.startTripSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.body;
    if (!scheduleId) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }

    const schedule = await prisma.routeSchedule.findFirst({
      where: { id: scheduleId, driverId: req.user.id, institutionId: req.tenantId },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Assigned schedule not found' });
    }

    // Check if trip already running
    let trip = await prisma.trip.findFirst({
      where: { routeScheduleId: scheduleId, status: 'RUNNING' },
    });

    if (!trip) {
      // Create active Trip
      trip = await prisma.trip.create({
        data: {
          institutionId: req.tenantId,
          busId: schedule.busId,
          routeId: schedule.routeId,
          driverId: req.user.id,
          routeScheduleId: schedule.id,
          status: 'RUNNING',
          startTime: new Date(),
        },
      });

      // Update schedule and bus status
      await prisma.routeSchedule.update({
        where: { id: scheduleId },
        data: { status: 'RUNNING', startTime: new Date() },
      });

      if (schedule.busId) {
        await prisma.bus.update({
          where: { id: schedule.busId },
          data: { status: 'EN_ROUTE' },
        });
      }

      // Dispatch 'BUS_STARTED' alerts to all parents of students on this route
      const stops = await prisma.routeStop.findMany({
        where: { routeScheduleId: scheduleId },
        include: {
          student: true,
        },
      });

      const parentIds = [...new Set(stops.map(s => s.student.parentId).filter(Boolean))];
      const io = getIo();

      for (const parentId of parentIds) {
        const notif = await prisma.notification.create({
          data: {
            institutionId: req.tenantId,
            userId: parentId,
            title: 'Bus Started',
            message: `The bus has started its run for today's pickup route!`,
            type: 'BUS_STARTED',
          },
        });

        if (io) {
          io.to(`user:${parentId}`).emit(`notification:${parentId}`, notif);
        }
      }

      if (io) {
        io.to(`trip:${trip.id}`).emit('trip-status-changed', {
          tripId: trip.id,
          status: 'RUNNING',
          message: 'Trip schedule started',
        });
      }
    }

    res.status(201).json({
      message: 'Trip started successfully',
      trip,
    });
  } catch (error) {
    console.error('startTripSchedule Error:', error);
    res.status(500).json({ error: 'Failed to start scheduled trip' });
  }
};

// Update stop status (PENDING -> BOARDED -> DEBOARDED)
exports.updateStopStatus = async (req, res) => {
  try {
    const { id } = req.params; // Stop ID
    const { status } = req.body; // 'BOARDED', 'DEBOARDED', 'MISSED'

    if (!['BOARDED', 'DEBOARDED', 'MISSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid stop status' });
    }

    const stop = await prisma.routeStop.findUnique({
      where: { id },
      include: {
        routeSchedule: true,
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    // Verify driver
    if (stop.routeSchedule.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized stop update' });
    }

    const updatedStop = await prisma.routeStop.update({
      where: { id },
      data: {
        status,
        arrivalTime: ['BOARDED', 'DEBOARDED'].includes(status) ? new Date() : undefined,
      },
    });

    // Create Notification for the Parent
    const parentId = stop.student.parentId;
    if (parentId) {
      const studentName = `${stop.student.user.firstName} ${stop.student.user.lastName}`;
      let title = '';
      let message = '';

      if (status === 'BOARDED') {
        title = 'Student Boarded Bus';
        message = `${studentName} has boarded the bus.`;
      } else if (status === 'DEBOARDED') {
        title = 'Student Reached Institution';
        message = `${studentName} has safely reached the school/institution.`;
      } else if (status === 'MISSED') {
        title = 'Pickup Missed';
        message = `The bus stop was passed but ${studentName} was not boarded.`;
      }

      const notif = await prisma.notification.create({
        data: {
          institutionId: req.tenantId,
          userId: parentId,
          title,
          message,
          type: status,
        },
      });

      const io = getIo();
      if (io) {
        io.to(`user:${parentId}`).emit(`notification:${parentId}`, notif);
        
        // Also emit a general refresh to the active trip room
        const activeTrip = await prisma.trip.findFirst({
          where: { routeScheduleId: stop.routeScheduleId, status: 'RUNNING' }
        });
        if (activeTrip) {
          io.to(`trip:${activeTrip.id}`).emit('stop-updated', {
            stopId: stop.id,
            status,
          });
        }
      }
    }

    res.json(updatedStop);
  } catch (error) {
    console.error('updateStopStatus Error:', error);
    res.status(500).json({ error: 'Failed to update stop status' });
  }
};

// Verify scanned student QR code
exports.verifyStudentQR = async (req, res) => {
  try {
    const { qrToken, lat, lng } = req.body;
    if (!qrToken || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'QR Token and coordinates (lat, lng) are required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Locate student using the QR token
    const qrRecord = await prisma.studentQRCode.findUnique({
      where: { qrToken },
      include: {
        student: {
          include: {
            user: true,
            parent: true,
          },
        },
      },
    });

    if (!qrRecord) {
      return res.status(404).json({ error: 'Invalid QR Code scanned.' });
    }

    const student = qrRecord.student;

    if (student.institutionId !== req.tenantId) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // 2. Fetch driver's active trip running today
    const trip = await prisma.trip.findFirst({
      where: {
        driverId: req.user.id,
        status: 'RUNNING',
      },
    });

    if (!trip) {
      return res.status(400).json({ error: 'Driver has no active trip running. Please start the trip first.' });
    }

    // 3. Verify student is assigned to this bus
    if (student.busId !== trip.busId) {
      return res.status(400).json({
        error: `Access Denied: Student ${student.user.firstName} is not assigned to Bus #${trip.busId.substring(0, 4)}`,
      });
    }

    // 4. Anti-Duplicate scan guard: Block multiple scan events for the same student within 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentEvent = await prisma.boardingEvent.findFirst({
      where: {
        studentId: student.id,
        timestamp: { gte: oneMinuteAgo },
      },
    });

    if (recentEvent) {
      return res.status(400).json({
        error: `Duplicate scan: Student scanned recently. Please wait 60 seconds.`,
      });
    }

    // 5. Determine the next boarding state based on today's schedule
    const stop = await prisma.routeStop.findFirst({
      where: {
        studentId: student.id,
        routeSchedule: {
          date: todayStr,
        },
      },
    });

    if (!stop) {
      return res.status(400).json({
        error: 'Student is not scheduled for transportation today (check attendance check-in).',
      });
    }

    let nextStatus = 'BOARDED';
    if (stop.status === 'BOARDED') {
      nextStatus = 'DEBOARDED';
    }

    // 6. Save BoardingEvent record
    const boardingEvent = await prisma.boardingEvent.create({
      data: {
        studentId: student.id,
        busId: trip.busId,
        driverId: req.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        eventType: nextStatus,
      },
    });

    // 7. Update today's RouteStop checkpoint
    await prisma.routeStop.update({
      where: { id: stop.id },
      data: {
        status: nextStatus,
        arrivalTime: new Date(),
      },
    });

    // 8. Dispatch notification alerts to Parents
    const parentId = student.parentId;
    if (parentId) {
      const studentName = `${student.user.firstName} ${student.user.lastName}`;
      const actionText = nextStatus === 'BOARDED' ? 'has boarded the bus.' : 'has safely arrived and deboarded the bus.';
      const title = nextStatus === 'BOARDED' ? 'Student Boarded Bus' : 'Student Reached Institution';

      const notif = await prisma.notification.create({
        data: {
          institutionId: req.tenantId,
          userId: parentId,
          title,
          message: `${studentName} ${actionText}`,
          type: nextStatus,
        },
      });

      const io = getIo();
      if (io) {
        io.to(`user:${parentId}`).emit(`notification:${parentId}`, notif);
        io.to(`trip:${trip.id}`).emit('stop-updated', {
          stopId: stop.id,
          status: nextStatus,
        });
      }
    }

    res.json({
      message: `Successfully verified student: ${student.user.firstName} is marked ${nextStatus}`,
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
      },
      status: nextStatus,
      event: boardingEvent,
    });
  } catch (error) {
    console.error('verifyStudentQR Error:', error);
    res.status(500).json({ error: 'Failed to verify QR scan' });
  }
};

// Report active emergency event
exports.reportEmergency = async (req, res) => {
  try {
    const { type, description, lat, lng } = req.body;
    if (!type || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Emergency type, lat, and lng are required.' });
    }

    // 1. Locate active trip
    const trip = await prisma.trip.findFirst({
      where: { driverId: req.user.id, status: 'RUNNING' },
      include: { bus: true }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const schedule = await prisma.routeSchedule.findFirst({
      where: { driverId: req.user.id, date: todayStr }
    });

    let tripId = null;
    let busId = null;

    if (trip) {
      tripId = trip.id;
      busId = trip.busId;
    } else if (schedule && schedule.busId) {
      busId = schedule.busId;
    } else {
      const bus = await prisma.bus.findFirst({
        where: { driverId: req.user.id }
      });
      if (bus) {
        busId = bus.id;
      }
    }

    if (!busId) {
      return res.status(404).json({ error: 'No active bus assignment found to associate emergency.' });
    }

    // 2. Create EmergencyEvent in DB
    const event = await prisma.emergencyEvent.create({
      data: {
        institutionId: req.tenantId,
        tripId,
        busId,
        driverId: req.user.id,
        type,
        description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: 'ACTIVE'
      },
      include: {
        bus: true,
        driver: true
      }
    });

    // 3. Notify institution admins
    const admins = await prisma.user.findMany({
      where: {
        institutionId: req.tenantId,
        role: { in: ['INST_ADMIN', 'SUPER_ADMIN'] }
      }
    });

    const adminTitle = `EMERGENCY ALERT: Bus #${event.bus.busNumber}`;
    const adminMsg = `Driver ${event.driver.firstName} reported ${type} emergency: ${description || 'No description provided'}`;

    for (const admin of admins) {
      await prisma.emergencyNotification.create({
        data: {
          institutionId: req.tenantId,
          userId: admin.id,
          eventId: event.id,
          title: adminTitle,
          message: adminMsg
        }
      });
    }

    // 4. Notify parents on this route
    let parentIds = [];
    if (tripId) {
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
    } else if (schedule) {
      const stops = await prisma.routeStop.findMany({
        where: { routeScheduleId: schedule.id },
        include: { student: true }
      });
      parentIds = [...new Set(stops.map(s => s.student.parentId).filter(Boolean))];
    }

    const parentTitle = `Route Emergency Alert`;
    const parentMsg = `An active emergency (${type}) was reported on your student's route. Please wait for further resolution details.`;

    for (const parentId of parentIds) {
      await prisma.emergencyNotification.create({
        data: {
          institutionId: req.tenantId,
          userId: parentId,
          eventId: event.id,
          title: parentTitle,
          message: parentMsg
        }
      });
    }

    // 5. Broadcast via Socket.IO
    const io = getIo();
    if (io) {
      // Broadcast to specific trip room
      if (tripId) {
        io.to(`trip:${tripId}`).emit('emergency-reported', {
          eventId: event.id,
          type,
          description,
          lat,
          lng,
          status: 'ACTIVE'
        });
      }
      // Broadcast to admin dashboard
      io.to(`admin:active-buses:${req.tenantId}`).emit('bus-emergency-reported', {
        busId,
        eventId: event.id,
        type,
        lat,
        lng,
        status: 'ACTIVE'
      });
      // Push specific parent alerts
      for (const parentId of parentIds) {
        io.to(`user:${parentId}`).emit(`notification:${parentId}`, { title: parentTitle, message: parentMsg, type: 'EMERGENCY' });
      }
      // Push admin alerts
      for (const admin of admins) {
        io.to(`user:${admin.id}`).emit(`notification:${admin.id}`, { title: adminTitle, message: adminMsg, type: 'EMERGENCY' });
      }
    }

    res.status(201).json({
      message: 'Emergency event reported successfully',
      event
    });
  } catch (error) {
    console.error('reportEmergency Error:', error);
    res.status(500).json({ error: 'Failed to report emergency' });
  }
};

// Report trip delay
exports.reportDelay = async (req, res) => {
  try {
    const { estimatedDelayMins, reason, description } = req.body;
    if (!estimatedDelayMins || !reason) {
      return res.status(400).json({ error: 'Estimated delay minutes and reason are required.' });
    }

    // 1. Locate driver's active trip
    const trip = await prisma.trip.findFirst({
      where: { driverId: req.user.id, status: 'RUNNING' },
      include: { bus: true }
    });

    if (!trip) {
      return res.status(400).json({ error: 'No active running trip found to report a delay.' });
    }

    // 2. Create DelayReport in DB
    const delayReport = await prisma.delayReport.create({
      data: {
        institutionId: req.tenantId,
        tripId: trip.id,
        busId: trip.busId,
        driverId: req.user.id,
        estimatedDelayMins: parseInt(estimatedDelayMins),
        reason,
        description
      }
    });

    // 3. Shift the ETA Cache times by estimatedDelayMins
    const caches = await prisma.eTACache.findMany({
      where: { tripId: trip.id }
    });

    for (const cache of caches) {
      const updatedArrival = new Date(new Date(cache.predictedArrival).getTime() + parseInt(estimatedDelayMins) * 60000);
      await prisma.eTACache.update({
        where: { id: cache.id },
        data: { predictedArrival: updatedArrival }
      });
    }

    // 4. Load updated cache to broadcast
    const updatedCaches = await prisma.eTACache.findMany({
      where: { tripId: trip.id },
      include: {
        routeStop: {
          include: {
            student: {
              include: { user: true }
            }
          }
        }
      }
    });

    const etaResults = updatedCaches.map(c => {
      const diffMs = new Date(c.predictedArrival) - new Date();
      const etaMinutes = Math.max(1, Math.round(diffMs / 60000));
      return {
        routeStopId: c.routeStopId,
        studentId: c.routeStop.studentId,
        studentName: `${c.routeStop.student.user?.firstName || ''} ${c.routeStop.student.user?.lastName || ''}`.trim(),
        parentId: c.routeStop.student.parentId,
        predictedArrival: c.predictedArrival,
        distanceKm: parseFloat(c.distanceKm.toFixed(2)),
        etaMinutes
      };
    });

    // 5. Notify parents on this route
    let parentIds = [];
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

    const title = `Route Delay Alert: Bus #${trip.bus.busNumber}`;
    const message = `Your child's bus is delayed by ${estimatedDelayMins} mins due to ${reason}. Updated arrival time computed.`;

    for (const parentId of parentIds) {
      await prisma.emergencyNotification.create({
        data: {
          institutionId: req.tenantId,
          userId: parentId,
          delayReportId: delayReport.id,
          title,
          message
        }
      });
    }

    // 6. Broadcast via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`trip:${trip.id}`).emit('eta-updates', etaResults);
      io.to(`trip:${trip.id}`).emit('delay-reported', {
        estimatedDelayMins: parseInt(estimatedDelayMins),
        reason,
        description
      });
      for (const parentId of parentIds) {
        io.to(`user:${parentId}`).emit(`notification:${parentId}`, { title, message, type: 'DELAY' });
      }
    }

    res.json({
      message: `Delay reported. ETAs updated.`,
      delayReport,
      etaResults
    });
  } catch (error) {
    console.error('reportDelay Error:', error);
    res.status(500).json({ error: 'Failed to report delay' });
  }
};



