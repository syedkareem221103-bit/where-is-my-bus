import { AuditService } from '../audit/audit.service';
import bcryptjs from 'bcryptjs';
import { userRepository } from './user.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors';
import prisma from '../../config/database';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';

export class UserService {
  private canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
    if (actorRole === 'SUPER_ADMIN') return true;
    if (actorRole === 'ORG_ADMIN' && targetRole !== 'SUPER_ADMIN') return true;
    return false;
  }

  async createUser(data: any, actorId: string, actorRole: UserRole, organizationId: string): Promise<User> {
    if (!this.canManageRole(actorRole, data.role)) {
      throw new ForbiddenError('You do not have permission to assign this role');
    }

    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(data.password, salt);

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    return prisma.$transaction(async (tx) => {
      const user = await userRepository.create({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        organization: { connect: { organizationId } }
      }, tx);

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'USER_CREATED',
        metadata: { targetUserId: user.id, targetOrganizationId: organizationId, role: user.role },
        ipAddress: '0.0.0.0'
      }, tx);

      return user;
    });
  }

  async getUsers(organizationId: string, page: number, limit: number, role?: UserRole) {
    const skip = (page - 1) * limit;
    const { data, total } = await userRepository.findAll(organizationId, skip, limit, role);

    return {
      users: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(id: string, organizationId: string): Promise<User> {
    const user = await userRepository.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateUser(id: string, organizationId: string, data: any, actorId: string, actorRole: UserRole): Promise<User> {
    const user = await this.getUser(id, organizationId);

    // If updating role, check privileges for target role
    if (data.role && data.role !== user.role) {
      if (!this.canManageRole(actorRole, data.role) || !this.canManageRole(actorRole, user.role)) {
        throw new ForbiddenError('You do not have permission to change to or from this role');
      }
    }

    // [CRITICAL RBAC FIX]: If modifying ANOTHER user, verify privilege over their existing role
    if (id !== actorId) {
      if (!this.canManageRole(actorRole, user.role)) {
        throw new ForbiddenError('You do not have permission to modify this user');
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.role && { role: data.role }),
      ...(data.status && { status: data.status }),
    };

    const action = data.role && data.role !== user.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED';
    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    return prisma.$transaction(async (tx) => {
      const updated = await userRepository.update(id, organizationId, updateData, tx);

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: action,
        metadata: { targetUserId: user.id, targetOrganizationId: organizationId, updates: Object.keys(updateData) },
        ipAddress: '0.0.0.0'
      }, tx);

      return updated;
    });
  }

  async deleteUser(id: string, organizationId: string, actorId: string, actorRole: UserRole): Promise<User> {
    const user = await this.getUser(id, organizationId);

    if (id === actorId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    if (!this.canManageRole(actorRole, user.role)) {
      throw new ForbiddenError('You do not have permission to delete this user');
    }

    const actor = await prisma.user.findUnique({ where: { id: actorId } });

    return prisma.$transaction(async (tx) => {
      const deleted = await userRepository.update(id, organizationId, { status: UserStatus.DEACTIVATED }, tx);

      await AuditService.getInstance().logEvent({
        organizationId: organizationId,
        userId: actorId,
        action: 'USER_DEACTIVATED',
        metadata: { targetUserId: user.id, targetOrganizationId: organizationId },
        ipAddress: '0.0.0.0'
      }, tx);

      return deleted;
    });
  }
}

export const userService = new UserService();
