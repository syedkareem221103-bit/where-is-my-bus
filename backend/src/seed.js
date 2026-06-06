const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing database data...');
  try {
    await prisma.tripLog.deleteMany({});
    await prisma.eTACache.deleteMany({});
    await prisma.boardingEvent.deleteMany({});
    await prisma.studentQRCode.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.parentStudentMapping.deleteMany({});
    await prisma.routeStop.deleteMany({});
    await prisma.tripHistory.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.routeSchedule.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.bus.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.institution.deleteMany({});
    console.log('Existing database data cleaned successfully.');
  } catch (err) {
    console.warn('Warning during database clean:', err.message);
  }

  console.log('Seeding database...');

  // Hash standard password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create St. Mary's School Institution
  const school = await prisma.institution.upsert({
    where: { subdomain: 'stmarys' },
    update: {},
    create: {
      name: "St. Mary's School",
      subdomain: 'stmarys',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&auto=format&fit=crop&q=60',
      timezone: 'America/New_York',
      cutoffTime: '07:30',
    },
  });
  console.log(`Institution created: ${school.name} (Subdomain: ${school.subdomain})`);

  // 2. Create Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@busapp.com' },
    update: {},
    create: {
      email: 'superadmin@busapp.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+15550000000',
    },
  });

  // 3. Create Institution Admin
  const instAdmin = await prisma.user.upsert({
    where: { email: 'admin@stmarys.edu' },
    update: {},
    create: {
      institutionId: school.id,
      email: 'admin@stmarys.edu',
      passwordHash,
      role: 'INST_ADMIN',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+15551112222',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });
  console.log(`Admin user created: ${instAdmin.email}`);

  // 4. Create Drivers
  const driverBob = await prisma.user.upsert({
    where: { email: 'driver1@stmarys.edu' },
    update: {},
    create: {
      institutionId: school.id,
      email: 'driver1@stmarys.edu',
      passwordHash,
      role: 'DRIVER',
      firstName: 'Bob',
      lastName: 'Johnson',
      phone: '+15553334444',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const driverAlice = await prisma.user.upsert({
    where: { email: 'driver2@stmarys.edu' },
    update: {},
    create: {
      institutionId: school.id,
      email: 'driver2@stmarys.edu',
      passwordHash,
      role: 'DRIVER',
      firstName: 'Alice',
      lastName: 'Miller',
      phone: '+15555556666',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
  });
  console.log(`Drivers created: ${driverBob.email}, ${driverAlice.email}`);

  // 5. Create Buses and link drivers
  const bus14 = await prisma.bus.upsert({
    where: { institutionId_busNumber: { institutionId: school.id, busNumber: '14' } },
    update: { driverId: driverBob.id },
    create: {
      institutionId: school.id,
      busNumber: '14',
      licensePlate: 'ABC 1234',
      capacity: 24,
      driverId: driverBob.id,
      status: 'IDLE',
    },
  });

  const bus22 = await prisma.bus.upsert({
    where: { institutionId_busNumber: { institutionId: school.id, busNumber: '22' } },
    update: { driverId: driverAlice.id },
    create: {
      institutionId: school.id,
      busNumber: '22',
      licensePlate: 'XYZ 9876',
      capacity: 30,
      driverId: driverAlice.id,
      status: 'IDLE',
    },
  });
  console.log(`Buses created: Bus #${bus14.busNumber}, Bus #${bus22.busNumber}`);

  // 6. Create Routes
  // Center is New York Manhattan-ish / Brooklyn region
  // School Location: 40.73061, -73.935242 (Greenpoint, Brooklyn)
  const schoolLat = 40.730610;
  const schoolLng = -73.935242;

  const routeNorth = await prisma.route.create({
    data: {
      institutionId: school.id,
      name: 'Route A (North Loop)',
      startLat: 40.748440, // Depot / Empire State Area
      startLng: -73.985750,
      endLat: schoolLat,
      endLng: schoolLng,
    },
  });

  const routeSouth = await prisma.route.create({
    data: {
      institutionId: school.id,
      name: 'Route B (South Loop)',
      startLat: 40.7061, // Lower Manhattan
      startLng: -74.0090,
      endLat: schoolLat,
      endLng: schoolLng,
    },
  });
  console.log(`Routes created: ${routeNorth.name}, ${routeSouth.name}`);

  // 7. Create Parents & Students
  const parentsData = [
    { email: 'parent1@stmarys.edu', firstName: 'Mark', lastName: 'Johnson' },
    { email: 'parent2@stmarys.edu', firstName: 'Sarah', lastName: 'Carter' },
    { email: 'parent3@stmarys.edu', firstName: 'David', lastName: 'Davis' },
    { email: 'parent4@stmarys.edu', firstName: 'Helen', lastName: 'Lee' },
    { email: 'parent5@stmarys.edu', firstName: 'Richard', lastName: 'Smith' },
  ];

  const parents = [];
  for (const p of parentsData) {
    const parent = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        institutionId: school.id,
        email: p.email,
        passwordHash,
        role: 'PARENT',
        firstName: p.firstName,
        lastName: p.lastName,
        phone: '+15557778888',
      },
    });
    parents.push(parent);
  }
  console.log(`Parents created: ${parents.map(p => p.email).join(', ')}`);

  // Coordinates for student pick ups
  const studentsData = [
    {
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex.j@stmarys.edu',
      pickupLat: 40.758896, // Times Square area
      pickupLng: -73.985130,
      pickupAddress: 'Broadway & W 42nd St',
      parentIndex: 0,
      routeId: routeNorth.id,
      busId: bus14.id,
    },
    {
      firstName: 'Ben',
      lastName: 'Carter',
      email: 'ben.c@stmarys.edu',
      pickupLat: 40.752726, // Bryant Park area
      pickupLng: -73.981807,
      pickupAddress: '5th Ave & W 42nd St',
      parentIndex: 1,
      routeId: routeNorth.id,
      busId: bus14.id,
    },
    {
      firstName: 'Chloe',
      lastName: 'Davis',
      email: 'chloe.d@stmarys.edu',
      pickupLat: 40.741895, // Flatiron area
      pickupLng: -73.989308,
      pickupAddress: '5th Ave & W 23rd St',
      parentIndex: 2,
      routeId: routeNorth.id,
      busId: bus14.id,
    },
    {
      firstName: 'Daniel',
      lastName: 'Lee',
      email: 'daniel.l@stmarys.edu',
      pickupLat: 40.718066, // Soho/Chinatown area
      pickupLng: -73.998981,
      pickupAddress: 'Canal St & Lafayette St',
      parentIndex: 3,
      routeId: routeSouth.id,
      busId: bus22.id,
    },
    {
      firstName: 'Ella',
      lastName: 'Smith',
      email: 'ella.s@stmarys.edu',
      pickupLat: 40.722312, // Lower East Side
      pickupLng: -73.987376,
      pickupAddress: 'Delancey St & Essex St',
      parentIndex: 4,
      routeId: routeSouth.id,
      busId: bus22.id,
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  for (const s of studentsData) {
    const studentUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        institutionId: school.id,
        email: s.email,
        passwordHash,
        role: 'STUDENT',
        firstName: s.firstName,
        lastName: s.lastName,
      },
    });

    const student = await prisma.student.create({
      data: {
        institutionId: school.id,
        userId: studentUser.id,
        parentId: parents[s.parentIndex].id,
        routeId: s.routeId,
        busId: s.busId,
        pickupLat: s.pickupLat,
        pickupLng: s.pickupLng,
        pickupAddress: s.pickupAddress,
      },
    });

    // Create unique StudentQRCode
    await prisma.studentQRCode.create({
      data: {
        studentId: student.id,
        qrToken: `qr_token_${s.firstName.toLowerCase()}`,
      },
    });

    // Mark daily attendance for today
    // Alex, Ben, Chloe (Route North) are present. Daniel is present. Ella is absent (doesn't require ride)
    const requiresRide = s.firstName !== 'Ella'; // Ella is absent

    await prisma.attendance.create({
      data: {
        institutionId: school.id,
        studentId: student.id,
        date: todayStr,
        requiresRide,
        markedById: parents[s.parentIndex].id,
      },
    });
  }

  // 8. Seed historical TripHistory records for the past 7 days
  console.log('Seeding historical trip histories...');
  const pastDates = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    pastDates.push(d.toISOString().split('T')[0]);
  }

  for (const date of pastDates) {
    // Route North
    const durationNorth = 18 + Math.random() * 12; // 18 to 30 mins
    const onTimeNorth = durationNorth > 25 ? 'DELAYED' : 'ON_TIME';
    await prisma.tripHistory.create({
      data: {
        institutionId: school.id,
        routeId: routeNorth.id,
        busId: bus14.id,
        driverId: driverBob.id,
        totalDuration: parseFloat(durationNorth.toFixed(2)),
        averageSpeed: parseFloat((32 + Math.random() * 8).toFixed(2)),
        onTimeStatus: onTimeNorth,
        date,
      }
    });

    // Route South
    const durationSouth = 15 + Math.random() * 15; // 15 to 30 mins
    const onTimeSouth = durationSouth > 22 ? 'DELAYED' : 'ON_TIME';
    await prisma.tripHistory.create({
      data: {
        institutionId: school.id,
        routeId: routeSouth.id,
        busId: bus22.id,
        driverId: driverAlice.id,
        totalDuration: parseFloat(durationSouth.toFixed(2)),
        averageSpeed: parseFloat((30 + Math.random() * 10).toFixed(2)),
        onTimeStatus: onTimeSouth,
        date,
      }
    });
  }

  // 9. Seed active emergency alerts and resolved emergency logs
  console.log('Seeding active emergencies and delay reports...');
  
  // Active emergency breakdown alert
  await prisma.emergencyEvent.create({
    data: {
      institutionId: school.id,
      busId: bus14.id,
      driverId: driverBob.id,
      type: 'BREAKDOWN',
      status: 'ACTIVE',
      description: 'Cooling fluid leak detected atTimes Square stop. Awaiting technician.',
      lat: 40.758896,
      lng: -73.985130
    }
  });

  // Resolved traffic delay
  await prisma.emergencyEvent.create({
    data: {
      institutionId: school.id,
      busId: bus14.id,
      driverId: driverBob.id,
      type: 'TRAFFIC',
      status: 'RESOLVED',
      description: 'Heavy congestion near Brooklyn Bridge. | Resolved: Rerouted through Tunnel.',
      lat: 40.7061,
      lng: -74.0090,
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 days ago
      resolvedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 25 * 60000) // resolved in 25 mins
    }
  });

  // Resolved route obstruction
  await prisma.emergencyEvent.create({
    data: {
      institutionId: school.id,
      busId: bus22.id,
      driverId: driverAlice.id,
      type: 'OBSTRUCTION',
      status: 'RESOLVED',
      description: 'Construction blocking path on Delancey St. | Resolved: Obstacle moved by crew.',
      lat: 40.722312,
      lng: -73.987376,
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000), // 4 days ago
      resolvedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 15 * 60000) // resolved in 15 mins
    }
  });

  // Create a completed trip to link delays
  const completedTrip = await prisma.trip.create({
    data: {
      institutionId: school.id,
      busId: bus14.id,
      routeId: routeNorth.id,
      driverId: driverBob.id,
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 24 * 3600 * 1000),
      endTime: new Date(Date.now() - 24 * 3600 * 1000 + 35 * 60000)
    }
  });

  // Delay reports
  await prisma.delayReport.create({
    data: {
      institutionId: school.id,
      tripId: completedTrip.id,
      busId: bus14.id,
      driverId: driverBob.id,
      estimatedDelayMins: 15,
      reason: 'TRAFFIC',
      description: 'Severe rush hour gridlock near Queensboro Bridge.'
    }
  });

  await prisma.delayReport.create({
    data: {
      institutionId: school.id,
      tripId: completedTrip.id,
      busId: bus22.id,
      driverId: driverAlice.id,
      estimatedDelayMins: 20,
      reason: 'OBSTRUCTION',
      description: 'Road closed due to local parade blocking avenue.'
    }
  });

  console.log('Students, today\'s attendance, emergencies, and delays seeded.');
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
