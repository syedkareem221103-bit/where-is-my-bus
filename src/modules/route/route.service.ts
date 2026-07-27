import { routeRepository } from './route.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, Route, RouteStatus, UserRole } from '@prisma/client';

export class RouteService {
  async createRoute(data: any, actorId: string, actorRole: UserRole, organizationId: string): Promise<Route> {
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

    await prisma.auditLog.create({
      data: {
        action: 'ROUTE_CREATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { routeId: route.id, name: route.name, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
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

  async updateRoute(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole): Promise<Route> {
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
      ...(data.version !== undefined && { version: data.version }),
      ...(data.status && { status: data.status }),
    };

    const updated = await routeRepository.update(id, organizationId, updateData);

    const action = data.status && data.status !== route.status ? 'ROUTE_STATUS_CHANGED' : 'ROUTE_UPDATED';

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action,
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { routeId: route.id, targetOrganizationId: organizationId, updates: Object.keys(updateData) },
        ipAddress: '0.0.0.0',
      },
    });

    return updated;
  }

  async deleteRoute(id: string, organizationId: string, actorId: string, actorRole: UserRole): Promise<Route> {
    const route = await this.getRoute(id, organizationId);

    const deleted = await routeRepository.update(id, organizationId, { status: RouteStatus.INACTIVE });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'ROUTE_DEACTIVATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { routeId: route.id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return deleted;
  }
}

export const routeService = new RouteService();
export default routeService;
