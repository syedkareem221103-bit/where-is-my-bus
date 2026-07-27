import { parentRepository } from './parent.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, UserStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class ParentService {
  async createParent(data: any, actorId: string, actorRole: UserRole, organizationId: string) {
    const existing = await parentRepository.findByEmail(data.email, organizationId);
    if (existing) {
      throw new ConflictError(`Parent with email '${data.email}' already exists in your organization`);
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : await bcrypt.hash(Math.random().toString(36), 10);

    const parent = await parentRepository.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      role: UserRole.PARENT,
      status: data.status || UserStatus.ACTIVE,
      organization: { connect: { organizationId } },
    });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'PARENT_CREATED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { parentId: parent.id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return this.getParent(parent.id, organizationId);
  }

  async getParents(organizationId: string, page: number, limit: number, status?: UserStatus, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await parentRepository.findAll(organizationId, skip, limit, status, search);

    return {
      parents: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getParent(id: string, organizationId: string) {
    const parent = await parentRepository.findById(id, organizationId);
    if (!parent) {
      throw new NotFoundError('Parent not found');
    }
    return parent;
  }

  async updateParent(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole) {
    const parent = await this.getParent(id, organizationId);

    // OPERATOR role restricted to status updates only
    if (actorRole === 'OPERATOR') {
      if (data.email || data.firstName || data.lastName || data.password) {
        throw new ForbiddenError('OPERATOR is only permitted to update parent status');
      }
    }

    // Duplicate email check if modifying
    if (data.email && data.email !== parent.email) {
      const existing = await parentRepository.findByEmail(data.email, organizationId);
      if (existing) {
        throw new ConflictError(`Parent with email '${data.email}' already exists in your organization`);
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(data.email && { email: data.email }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.status && { status: data.status }),
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    let updated = parent;
    if (Object.keys(updateData).length > 0) {
      updated = await parentRepository.update(id, organizationId, updateData);
    }

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    if (data.status && data.status !== parent.status) {
      await prisma.auditLog.create({
        data: {
          action: 'PARENT_STATUS_CHANGED',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { parentId: id, oldStatus: parent.status, newStatus: data.status, targetOrganizationId: organizationId },
          ipAddress: '0.0.0.0',
        },
      });
    }

    if (Object.keys(data).length > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'PARENT_UPDATED',
          userId: actorId,
          organizationId: actor!.organizationId,
          metadata: { parentId: id, targetOrganizationId: organizationId, updates: Object.keys(data) },
          ipAddress: '0.0.0.0',
        },
      });
    }

    return this.getParent(id, organizationId);
  }

  async deleteParent(id: string, organizationId: string, actorId: string, actorRole: UserRole) {
    const parent = await this.getParent(id, organizationId);

    const deleted = await parentRepository.delete(id, organizationId);

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'PARENT_DELETED',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { parentId: id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return deleted;
  }

  async linkStudent(id: string, organizationId: string, studentId: string, relationshipType: string, actorId: string) {
    await this.getParent(id, organizationId); // Ensure parent exists

    const link = await parentRepository.linkStudent(id, studentId, organizationId, relationshipType);

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'PARENT_LINKED_STUDENT',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { parentId: id, studentId, relationshipType, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return link;
  }

  async unlinkStudent(id: string, organizationId: string, studentId: string, actorId: string) {
    await this.getParent(id, organizationId); // Ensure parent exists

    await parentRepository.unlinkStudent(id, studentId, organizationId);

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    await prisma.auditLog.create({
      data: {
        action: 'PARENT_UNLINKED_STUDENT',
        userId: actorId,
        organizationId: actor!.organizationId,
        metadata: { parentId: id, studentId, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0',
      },
    });

    return { message: 'Student unlinked successfully' };
  }
}

export const parentService = new ParentService();
export default parentService;
