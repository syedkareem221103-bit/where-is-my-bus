import { prisma } from '../../config/database';

export class AuditService {
  async logEvent(data: {
    organizationId: string;
    userId: string;
    action: string;
    metadata: any;
    ipAddress?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        metadata: data.metadata,
        ipAddress: data.ipAddress || 'internal',
      },
    });
  }
}
