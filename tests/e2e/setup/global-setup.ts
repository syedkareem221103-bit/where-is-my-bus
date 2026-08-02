import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function globalSetup() {
  console.log('--- Starting Global Test Setup ---');
  
  // Ensure the database schema is up-to-date
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Clean the database
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.systemHealthSnapshot.deleteMany({});
  
  // Seed Organization
  const org = await prisma.organization.create({
    data: {
      name: 'E2E Test Organization',
      contactEmail: 'e2e@example.com',
      contactPhone: '1234567890',
    }
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed Users
  await prisma.user.create({
    data: {
      email: 'admin@e2e.com',
      passwordHash,
      role: 'ORG_ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      orgId: org.id
    }
  });

  await prisma.user.create({
    data: {
      email: 'driver@e2e.com',
      passwordHash,
      role: 'DRIVER',
      firstName: 'Driver',
      lastName: 'User',
      orgId: org.id
    }
  });

  await prisma.user.create({
    data: {
      email: 'parent@e2e.com',
      passwordHash,
      role: 'PARENT',
      firstName: 'Parent',
      lastName: 'User',
      orgId: org.id
    }
  });

  console.log('--- Global Test Setup Complete ---');
}

export default globalSetup;
