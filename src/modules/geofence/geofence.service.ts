import { PrismaClient, Geofence, GeofenceType } from '@prisma/client';
import Redis from 'ioredis';
import logger from '../../utils/logger';
import { CreateGeofenceDTO, UpdateGeofenceDTO } from './geofence.types';

const prisma = new PrismaClient();

export class GeofenceService {
  private static instance: GeofenceService;
  
  // Cache organized by organizationId
  private geofencesCache: Map<string, Geofence[]> = new Map();
  private redisPub: Redis;
  private redisSub: Redis;
  private readonly SYNC_CHANNEL = 'geofence:sync';

  private constructor() {
    // Note: In a real production setup, connection string would come from env
    if (process.env.NODE_ENV === 'test') {
      const RedisMock = require('ioredis-mock');
      this.redisPub = new RedisMock();
      this.redisSub = new RedisMock();
    } else {
      this.redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    this.setupRedisSubscription();
    this.hydrateAllCaches();
  }

  public static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  private setupRedisSubscription() {
    this.redisSub.subscribe(this.SYNC_CHANNEL, (err, count) => {
      if (err) {
        logger.error('Failed to subscribe to geofence sync channel', { error: err.message });
      }
    });

    this.redisSub.on('message', async (channel, message) => {
      if (channel === this.SYNC_CHANNEL) {
        try {
          const payload = JSON.parse(message);
          if (payload.action && payload.orgId) {
            await this.hydrateCacheForOrg(payload.orgId);
          }
        } catch (error) {
          logger.error('Failed to process geofence sync message', { error });
        }
      }
    });
  }

  private async hydrateAllCaches() {
    try {
      const activeGeofences = await prisma.geofence.findMany({
        where: { isActive: true }
      });
      
      this.geofencesCache.clear();
      
      activeGeofences.forEach(gf => {
        if (!this.geofencesCache.has(gf.organizationId)) {
          this.geofencesCache.set(gf.organizationId, []);
        }
        this.geofencesCache.get(gf.organizationId)!.push(gf);
      });
      
      logger.info(`Geofence cache hydrated with ${activeGeofences.length} geofences across ${this.geofencesCache.size} organizations.`);
    } catch (error) {
      logger.error('Failed to hydrate all geofence caches', { error });
    }
  }

  private async hydrateCacheForOrg(orgId: string) {
    try {
      const activeGeofences = await prisma.geofence.findMany({
        where: { organizationId: orgId, isActive: true }
      });
      
      this.geofencesCache.set(orgId, activeGeofences);
      logger.info(`Geofence cache rehydrated for organization ${orgId} with ${activeGeofences.length} geofences.`);
    } catch (error) {
      logger.error(`Failed to hydrate geofence cache for organization ${orgId}`, { error });
    }
  }

  private notifyCluster(orgId: string, action: string, geofenceId: string) {
    const payload = JSON.stringify({ action, orgId, geofenceId, timestamp: new Date().toISOString() });
    this.redisPub.publish(this.SYNC_CHANNEL, payload).catch(err => {
      logger.error('Failed to publish geofence sync event', { error: err.message });
    });
  }

  public getGeofencesForOrg(orgId: string): Geofence[] {
    return this.geofencesCache.get(orgId) || [];
  }

  public async getGeofences(orgId: string): Promise<Geofence[]> {
    return prisma.geofence.findMany({ where: { organizationId: orgId } });
  }

  public async createGeofence(orgId: string, data: CreateGeofenceDTO): Promise<Geofence> {
    const gf = await prisma.geofence.create({
      data: {
        organizationId: orgId,
        name: data.name,
        type: data.type,
        geometry: data.geometry,
        isActive: data.isActive ?? true,
      }
    });

    this.notifyCluster(orgId, 'CREATE', gf.id);
    return gf;
  }

  public async updateGeofence(orgId: string, id: string, data: UpdateGeofenceDTO): Promise<Geofence> {
    // Ensure exists and belongs to org
    const existing = await prisma.geofence.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== orgId) {
      throw new Error('Geofence not found');
    }

    const gf = await prisma.geofence.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        geometry: data.geometry,
        isActive: data.isActive,
      }
    });

    this.notifyCluster(orgId, 'UPDATE', gf.id);
    return gf;
  }

  public async deleteGeofence(orgId: string, id: string): Promise<void> {
    const existing = await prisma.geofence.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== orgId) {
      throw new Error('Geofence not found');
    }

    await prisma.geofence.delete({ where: { id } });
    this.notifyCluster(orgId, 'DELETE', id);
  }
}

export default GeofenceService.getInstance();
