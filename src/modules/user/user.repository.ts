import prisma from '../../config/database';
import { Prisma, User, UserRole } from '@prisma/client';

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findById(id: string, organizationId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(organizationId: string, skip: number, take: number, role?: UserRole): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = { organizationId };
    if (role) {
      where.role = role;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, organizationId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
      data,
    });
  }
}

export const userRepository = new UserRepository();
