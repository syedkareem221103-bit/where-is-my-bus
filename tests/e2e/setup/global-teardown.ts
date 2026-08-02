import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function globalTeardown() {
  console.log('--- Starting Global Test Teardown ---');
  
  // Clean the database
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  
  await prisma.$disconnect();
  console.log('--- Global Test Teardown Complete ---');
}

export default globalTeardown;
