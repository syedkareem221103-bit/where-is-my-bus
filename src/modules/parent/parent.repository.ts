import prisma from '../../config/database';
import { User, Prisma, UserStatus, UserRole } from '@prisma/client';

export class ParentRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        role: UserRole.PARENT,
      },
      include: {
        parentChildren: { include: { student: true } },
      },
    });
  }

  async findById(id: string, organizationId: string): Promise<any | null> {
    return prisma.user.findFirst({
      where: {
        id,
        organizationId,
        role: UserRole.PARENT,
      },
      include: {
        parentChildren: { include: { student: true } },
      },
    });
  }

  async findByEmail(email: string, organizationId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        organizationId,
      },
    });
  }

  async findAll(
    organizationId: string,
    skip: number,
    take: number,
    status?: UserStatus,
    search?: string
  ): Promise<{ data: any[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      organizationId,
      role: UserRole.PARENT,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          parentChildren: { include: { student: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, organizationId: string, data: Prisma.UserUpdateInput): Promise<any> {
    return prisma.user.update({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      data,
      include: {
        parentChildren: { include: { student: true } },
      },
    });
  }

  async delete(id: string, organizationId: string): Promise<any> {
    return prisma.user.update({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      data: {
        status: UserStatus.DEACTIVATED,
      },
    });
  }

  async linkStudent(parentId: string, studentId: string, organizationId: string, relationshipType = 'PARENT'): Promise<any> {
    return prisma.parentChild.upsert({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      create: {
        organization: { connect: { organizationId } },
        parent: { connect: { id_organizationId: { id: parentId, organizationId } } },
        student: { connect: { id_organizationId: { id: studentId, organizationId } } },
        relationshipType,
      },
      update: {
        relationshipType,
      },
    });
  }

  async unlinkStudent(parentId: string, studentId: string, organizationId: string): Promise<any> {
    return prisma.parentChild.delete({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });
  }
}

export const parentRepository = new ParentRepository();
export default parentRepository;
