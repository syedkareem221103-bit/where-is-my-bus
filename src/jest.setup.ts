const original = jest.requireActual('@prisma/client');

jest.mock('@prisma/client', () => original);

afterAll(async () => {
  try {
    const { teardownApp } = require(__dirname + '/app');
    // Call teardownApp without skipPrisma so it can conditionally disconnect Prisma
    // ONLY if the test suite actually evaluated the proxy and used the database.
    await teardownApp();
  } catch (error) {
    console.error('Failed to run dynamic teardown in jest.setup.ts', error);
  }
});
