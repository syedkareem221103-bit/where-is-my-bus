import { AuditService } from '../audit/audit.service';
import { routeRepository } from './route.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Route, RouteStatus, UserRole } from '@prisma/client';

export class RouteService {
  async createRoute(data: any, actorId: string, actorRole: UserRole, organizationId: string, ipAddress: string): Promise<Route> {
    const existing = await routeRepository.findByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`Route with name '${data.name}' already exists in your organization`);
    }

    const route = await routeRepository.create({
      name: data.name,
      version: data.version || 1,
      status: data.status || RouteStatus.ACTIVE,
      organization: { connect: { organizationId } },
    });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'ROUTE_CREATED',
        metadata: { routeId: route.id, name: route.name, targetOrganizationId: organizationId },
        ipAddress: undefined
      });

    return route;
  }

  async getRoutes(organizationId: string, page: number, limit: number, status?: RouteStatus, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await routeRepository.findAll(organizationId, skip, limit, status, search);

    return {
      routes: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRoute(id: string, organizationId: string): Promise<Route> {
    const route = await routeRepository.findById(id, organizationId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    return route;
  }

  async updateRoute(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole, ipAddress: string): Promise<Route> {
    const route = await this.getRoute(id, organizationId);

    // OPERATOR role restricted to status updates only
    if (actorRole === 'OPERATOR') {
      if (data.name || data.version !== undefined) {
        throw new ForbiddenError('OPERATOR is only permitted to update route status');
      }
    }

    // Check duplicate name within the same organization if modified
    if (data.name && data.name !== route.name) {
      const existing = await routeRepository.findByName(data.name, organizationId);
      if (existing) {
        throw new ConflictError(`Route with name '${data.name}' already exists in your organization`);
      }
    }

    const updateData: Prisma.RouteUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.status && { status: data.status }),
      version: { increment: 1 },
    };

    const updated = await routeRepository.update(id, organizationId, updateData);

    const action = data.status && data.status !== route.status ? 'ROUTE_STATUS_CHANGED' : 'ROUTE_UPDATED';

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: action,
        metadata: { routeId: route.id, targetOrganizationId: organizationId, updates: Object.keys(updateData) },
        ipAddress: undefined
      });

    return updated;
  }

  async deleteRoute(id: string, organizationId: string, actorId: string, actorRole: UserRole, ipAddress: string): Promise<Route> {
    const route = await this.getRoute(id, organizationId);

    const deleted = await prisma.$transaction(async (tx) => {
      const activeSchedule = await tx.schedule.findFirst({
        where: { routeId: id, organizationId, isActive: true },
      });

      if (activeSchedule) {
        throw new ConflictError('Cannot deactivate route: active schedules are currently associated with it.');
      }

      return tx.route.update({
        where: { id_organizationId: { id, organizationId } },
        data: { status: RouteStatus.INACTIVE },
      });
    });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'ROUTE_DEACTIVATED',
        metadata: { routeId: route.id, targetOrganizationId: organizationId },
        ipAddress: undefined
      });

    return deleted;
  }
}

export const routeService = new RouteService();
export default routeService;
