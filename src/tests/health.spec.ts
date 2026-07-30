import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  $queryRaw: jest.fn()
}));

describe('Health & Readiness Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK and basic liveness stats', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /ready', () => {
    it('should return 200 OK when database is responsive', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      
      const response = await request(app).get('/ready');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return 503 Service Unavailable when database is unresponsive', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection timeout'));
      
      const response = await request(app).get('/ready');
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unavailable');
      expect(response.body).toHaveProperty('error', 'Database connection failed');
    });
  });
});
