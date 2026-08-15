import { prisma } from '../../config/database';
import { Prisma, Organization, User, DeviceSession, AuditLog } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { organizationId: subdomain },
    });
  }



  async createOrganizationWithAdmin(
    orgInput: Prisma.OrganizationCreateInput,
    adminInput: Omit<Prisma.UserCreateInput, 'organization'>
  ): Promise<{ organization: Organization; admin: User }> {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: orgInput,
      });

      const admin = await tx.user.create({
        data: {
          ...adminInput,
          organization: {
            connect: { id: organization.id },
          },
        },
      });

      return { organization, admin };
    });
  }



  async createDeviceSession(data: Prisma.DeviceSessionUncheckedCreateInput): Promise<DeviceSession> {
    return prisma.deviceSession.create({ data });
  }

  async findDeviceSession(id: string, organizationId: string): Promise<DeviceSession | null> {
    return prisma.deviceSession.findFirst({
      where: { id, organizationId },
    });
  }

  async rotateDeviceSession(
    sid: string,
    orgId: string,
    userId: string,
    oldHash: string,
    newHash: string,
    expiresAt: Date
  ): Promise<number> {
    const result = await prisma.deviceSession.updateMany({
      where: {
        id: sid,
        organizationId: orgId,
        userId: userId,
        tokenHash: oldHash,
        expiresAt: {
          gt: new Date()
        }
      },
      data: {
        tokenHash: newHash,
        expiresAt: expiresAt
      }
    });
    return result.count;
  }

  async deleteDeviceSessionAndAudit(sid: string, orgId: string, userId: string, action: string, ipAddress: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.deviceSession.deleteMany({
        where: { id: sid, organizationId: orgId, userId: userId }
      });
      await tx.auditLog.create({
        data: {
          organization: { connect: { organizationId: orgId } },
          user: { connect: { id: userId } },
          action: action,
          metadata: { reason: "Suspected replay, stale rotated token, or session mismatch" },
          ipAddress: ipAddress
        }
      });
    });
  }

  async deleteDeviceSession(sid: string, orgId: string, userId: string): Promise<void> {
    await prisma.deviceSession.deleteMany({
      where: { id: sid, organizationId: orgId, userId: userId }
    });
  }

  async createAuditLog(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  }
}

export default AuthRepository;
