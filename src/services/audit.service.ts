import { AuditService as CoreAuditService } from '../modules/audit/audit.service';
import logger from '../utils/logger';

export class AuditService {
  private static instance: AuditService;
  private coreService: CoreAuditService;

  private constructor() {
    this.coreService = CoreAuditService.getInstance();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async log(params: {
    organizationId: string;
    userId: string;
    action: string;
    details: any;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const metadata = typeof params.details === 'object' && params.details !== null
        ? params.details
        : { raw: params.details };

      await this.coreService.logEvent({
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        metadata,
        ipAddress: params.ipAddress || '127.0.0.1',
      });

      logger.info(`AuditLog [${params.action}] recorded for user ${params.userId}`);
    } catch (error) {
      logger.error('Failed to write audit log details to database:', error);
    }
  }
}

export default AuditService;
