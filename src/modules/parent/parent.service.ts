import { AuditService } from '../audit/audit.service';
import { parentRepository } from './parent.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, UserStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class ParentService {
  async createParent(data: any, actorId: string, actorRole: UserRole, organizationId: string, ipAddress: string) {
    const existing = await parentRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email '${data.email}' already exists`);
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : await bcrypt.hash(Math.random().toString(36), 10);

    const parentId = await prisma.$transaction(async (tx) => {
      const parent = await parentRepository.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        role: UserRole.PARENT,
        status: data.status || UserStatus.ACTIVE,
        organization: { connect: { organizationId } },
      }, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_CREATED',
        metadata: { parentId: parent.id, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);

      return parent.id;
    });

    return this.getParent(parentId, organizationId);
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

  async updateParent(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole, ipAddress: string) {
    const parent = await this.getParent(id, organizationId);

    // OPERATOR role restricted to status updates only
    if (actorRole === 'OPERATOR') {
      if (data.email || data.firstName || data.lastName || data.password) {
        throw new ForbiddenError('OPERATOR is only permitted to update parent status');
      }
    }

    // Duplicate email check if modifying
    if (data.email && data.email !== parent.email) {
      const existing = await parentRepository.findByEmail(data.email);
      if (existing) {
        throw new ConflictError(`User with email '${data.email}' already exists`);
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

    await prisma.$transaction(async (tx) => {
      let updated = parent;
      if (Object.keys(updateData).length > 0) {
        updated = await parentRepository.update(id, organizationId, updateData, tx);
      }

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      if (data.status && data.status !== parent.status) {
        await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_STATUS_CHANGED',
        metadata: { parentId: id, oldStatus: parent.status, newStatus: data.status, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);
      }

      if (Object.keys(data).length > 0) {
        await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_UPDATED',
        metadata: { parentId: id, targetOrganizationId: organizationId, updates: Object.keys(data) },
        ipAddress: ipAddress
      }, tx);
      }
    });

    return this.getParent(id, organizationId);
  }

  async deleteParent(id: string, organizationId: string, actorId: string, actorRole: UserRole, ipAddress: string) {
    const parent = await this.getParent(id, organizationId);

    const deleted = await prisma.$transaction(async (tx) => {
      const deletedParent = await parentRepository.delete(id, organizationId, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_DELETED',
        metadata: { parentId: id, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);

      return deletedParent;
    });

    return deleted;
  }

  async linkStudent(id: string, organizationId: string, studentId: string, relationshipType: string, actorId: string, ipAddress: string) {
    await this.getParent(id, organizationId); // Ensure parent exists

    const link = await prisma.$transaction(async (tx) => {
      const newLink = await parentRepository.linkStudent(id, studentId, organizationId, relationshipType, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_LINKED_STUDENT',
        metadata: { parentId: id, studentId, relationshipType, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);

      return newLink;
    });

    return link;
  }

  async unlinkStudent(id: string, organizationId: string, studentId: string, actorId: string, ipAddress: string) {
    await this.getParent(id, organizationId); // Ensure parent exists

    await prisma.$transaction(async (tx) => {
      await parentRepository.unlinkStudent(id, studentId, organizationId, tx);

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'PARENT_UNLINKED_STUDENT',
        metadata: { parentId: id, studentId, targetOrganizationId: organizationId },
        ipAddress: ipAddress
      }, tx);
    });

    return { message: 'Student unlinked successfully' };
  }
}

export const parentService = new ParentService();
export default parentService;
