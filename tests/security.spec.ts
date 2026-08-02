import request from 'supertest';
import app from '../src/app'; // Make sure app exports the express app

describe('Security Headers & JWT Configuration', () => {
  it('Should have Helmet security headers enabled', async () => {
    const res = await request(app).get('/api/v1/system/health');
    
    // Helmet headers
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-download-options']).toBe('noopen');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  it('Should reject weak JWT secrets (in environment setup)', () => {
    // Assert JWT_PRIVATE_KEY exists and has sufficient length
    const jwtSecret = process.env.JWT_PRIVATE_KEY || process.env.JWT_SECRET;
    expect(jwtSecret).toBeDefined();
    expect(jwtSecret!.length).toBeGreaterThanOrEqual(32); // Enterprise standard for HS256/RS256 is at least 256 bits (32 chars)
  });

  it('Should validate CORS configuration', async () => {
    const res = await request(app)
      .options('/api/v1/system/health')
      .set('Origin', 'http://malicious-site.com');

    // It should either reject the origin or not return it in Access-Control-Allow-Origin
    expect(res.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});
