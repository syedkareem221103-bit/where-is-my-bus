import prisma from '../../config/database';
import { Prisma, User, UserRole } from '@prisma/client';

export class UserRepository {
  async create(data: Prisma.UserCreateInput, tx: Prisma.TransactionClient = prisma): Promise<User> {
    return tx.user.create({ data });
  }

  async findById(id: string, organizationId: string, tx: Prisma.TransactionClient = prisma): Promise<User | null> {
    return tx.user.findUnique({
      where: {
        id_organizationId: {
          id,
          organizationId,
        },
      },
    });
  }

  async findByEmail(email: string, tx: Prisma.TransactionClient = prisma): Promise<User | null> {
    return tx.user.findUnique({
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

  async update(id: string, organizationId: string, data: Prisma.UserUpdateInput, tx: Prisma.TransactionClient = prisma): Promise<User> {
    return tx.user.update({
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
