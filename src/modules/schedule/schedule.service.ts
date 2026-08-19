import { AuditService } from '../audit/audit.service';
import { ScheduleRepository } from './schedule.repository';
import { NotFoundError, ConflictError, BadRequestError } from '../../errors';
import { prisma } from '../../config/database';
import { RouteStatus } from '@prisma/client';

export class ScheduleService {
  private scheduleRepository = new ScheduleRepository();

  async createSchedule(
    organizationId: string,
    data: {
      routeId: string;
      name: string;
      cutoffTime: string;
      operatingDays: number[];
    },
    actorId: string,
    ipAddress: string
  ) {
    // Validate that the route exists, belongs to the tenant, and is active
    const route = await prisma.route.findFirst({
      where: {
        id: data.routeId,
        organizationId,
        status: RouteStatus.ACTIVE,
      },
    });

    if (!route) {
      throw new BadRequestError('Route not found or is inactive');
    }

    const schedule = await this.scheduleRepository.create({
      routeId: data.routeId,
      name: data.name,
      cutoffTime: data.cutoffTime,
      operatingDays: data.operatingDays,
      organizationId,
      isActive: true,
    });

    // Create Audit Log
    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'SCHEDULE_CREATED',
        metadata: { scheduleId: schedule.id, routeId: schedule.routeId },
        ipAddress: undefined
      });

    return schedule;
  }

  async getSchedules(organizationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const take = limit;

    const [schedules, total] = await Promise.all([
      this.scheduleRepository.findAllByOrg(organizationId, skip, take),
      this.scheduleRepository.countByOrg(organizationId),
    ]);

    return {
      schedules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getScheduleById(organizationId: string, id: string) {
    const schedule = await this.scheduleRepository.findByIdAndOrg(id, organizationId);
    if (!schedule) {
      throw new NotFoundError('Schedule not found in your organization');
    }
    return schedule;
  }

  async updateSchedule(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      cutoffTime?: string;
      operatingDays?: number[];
      isActive?: boolean;
    },
    actorId: string,
    ipAddress: string
  ) {
    await this.getScheduleById(organizationId, id);
    const updated = await this.scheduleRepository.update(id, organizationId, data);
    
    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'SCHEDULE_UPDATED',
        metadata: { scheduleId: id, updates: data },
        ipAddress: undefined
      });
    
    return updated;
  }

  async deleteSchedule(organizationId: string, id: string, actorId: string, ipAddress: string) {
    await this.getScheduleById(organizationId, id);
    
    const deleted = await prisma.$transaction(async (tx) => {
      // Check for active trips associated with this schedule
      const activeTrips = await tx.trip.findFirst({
        where: {
          scheduleId: id,
          organizationId,
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
        },
      });

      if (activeTrips) {
        throw new ConflictError('Cannot deactivate schedule: active trips are currently associated with it.');
      }

      return tx.schedule.update({
        where: { id_organizationId: { id, organizationId } },
        data: { isActive: false },
      });
    });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'SCHEDULE_DEACTIVATED',
        metadata: { scheduleId: id },
        ipAddress: undefined
      });

    return deleted;
  }
}

export default ScheduleService;
