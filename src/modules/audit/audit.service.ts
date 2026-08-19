import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public sanitizePayload(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizePayload(item));
    }

    const sanitized: any = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (['password', 'hash', 'token', 'secret', 'apikey'].some(k => lowerKey.includes(k))) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = this.sanitizePayload(data[key]);
      }
    }
    return sanitized;
  }

  logEvent(data: {
    organizationId: string;
    userId: string;
    action: string;
    metadata: any;
    ipAddress?: string;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const sanitizedMetadata = this.sanitizePayload(data.metadata);

    return client.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        metadata: sanitizedMetadata,
        ipAddress: data.ipAddress || 'internal',
      },
    });
  }
}
